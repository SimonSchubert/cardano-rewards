import { BaseProvider } from './base-provider.js';

/**
 * Cardano Staking Rewards Provider
 * Handles checking for classic Cardano proof-of-stake delegation rewards
 * Uses Koios API (free public API) to check staking rewards
 */
export class CardanoStakingProvider extends BaseProvider {
    constructor() {
        super({
            name: 'Cardano Staking',
            id: 'cardano-staking',
            icon: 'https://cardano.org/img/favicon.ico',
            endpoint: 'https://proxy.cors.sh/https://api.koios.rest/api/v1',
            method: 'POST',
            platformUrl: 'https://cardano.org',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
    }

    /**
     * Check rewards for Cardano addresses
     * @param {string[]} addresses - Array of wallet addresses
     * @returns {Promise<Object>} Standardized reward response
     */
    async checkRewards(addresses) {
        try {
            const address = Array.isArray(addresses) ? addresses[0] : addresses;
            
            // Get address information including stake address
            const addressInfo = await this.getAddressInfo(address);
            if (!addressInfo || addressInfo.length === 0 || !addressInfo[0].stake_address) {
                return this.formatResponse({ account: null });
            }

            const stakeAddress = addressInfo[0].stake_address;
            
            // Get account information (includes rewards data)
            const accountInfo = await this.getAccountInfo(stakeAddress);
            
            return this.formatResponse({
                account: accountInfo && accountInfo.length > 0 ? accountInfo[0] : null,
                stakeAddress: stakeAddress
            });
        } catch (error) {
            throw new Error(`${this.name}: ${error.message}`);
        }
    }

    /**
     * Get address information including stake address
     * @param {string} address - Payment address
     * @returns {Promise<Array>} Address information array
     */
    async getAddressInfo(address) {
        const response = await fetch(`${this.endpoint}/address_info`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                _addresses: [address]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Get account information for stake address
     * @param {string} stakeAddress - Stake address
     * @returns {Promise<Array>} Account information array
     */
    async getAccountInfo(stakeAddress) {
        const response = await fetch(`${this.endpoint}/account_info`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                _stake_addresses: [stakeAddress]
            })
        });

        if (!response.ok) {
            if (response.status === 404) {
                return [];
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Format the provider's response into a standard format
     * @param {Object} response - Raw API response
     * @returns {Object} Standardized response format
     */
    formatResponse(response) {
        const { account, stakeAddress } = response;
        
        // Get rewards available for withdrawal
        let rewardsAvailable = 0;
        let totalRewards = 0;
        let withdrawals = 0;
        
        if (account) {
            rewardsAvailable = parseFloat(account.rewards_available || 0);
            totalRewards = parseFloat(account.rewards || 0);
            withdrawals = parseFloat(account.withdrawals || 0);
        }

        // Convert lovelace to ADA (1 ADA = 1,000,000 lovelace)
        const rewardsAvailableAda = rewardsAvailable / 1000000;
        const totalRewardsAda = totalRewards / 1000000;
        const withdrawalsAda = withdrawals / 1000000;

        const tokens = [];
        if (rewardsAvailableAda > 0) {
            tokens.push({
                symbol: 'ADA',
                name: 'Cardano',
                amount: rewardsAvailableAda,
                decimals: 6,
                policyId: 'ADA',
                assetName: ''
            });
        }

        // Prepare metadata
        const metadata = {
            stakeAddress: stakeAddress,
            rewardsAvailableLovelace: rewardsAvailable,
            rewardsAvailableAda: rewardsAvailableAda,
            totalRewardsLovelace: totalRewards,
            totalRewardsAda: totalRewardsAda,
            withdrawalsLovelace: withdrawals,
            withdrawalsAda: withdrawalsAda,
            claimUrl: 'https://eternl.io/app/mainnet/dashboard',
        };

        if (account) {
            metadata.delegatedPool = account.delegated_pool;
            metadata.delegatedDrep = account.delegated_drep;
            metadata.status = account.status;
            metadata.totalBalance = account.total_balance ? parseFloat(account.total_balance) / 1000000 : 0;
            metadata.utxoBalance = account.utxo ? parseFloat(account.utxo) / 1000000 : 0;
            metadata.deposit = account.deposit ? parseFloat(account.deposit) / 1000000 : 0;
            metadata.reserves = account.reserves ? parseFloat(account.reserves) / 1000000 : 0;
            metadata.treasury = account.treasury ? parseFloat(account.treasury) / 1000000 : 0;
        }

        return {
            success: true,
            provider: this.name,
            tokens: tokens,
            metadata: metadata
        };
    }

    /**
     * Override makeRequest since we use custom POST requests
     * @param {string[]} addresses - Array of wallet addresses
     * @returns {Promise<Object>} Raw API response
     */
    async makeRequest(addresses) {
        // This method is overridden in checkRewards for custom API calls
        return {};
    }

    /**
     * Build request for Koios API
     * @param {string[]} addresses - Array of wallet addresses
     * @returns {Object} Request payload
     */
    buildRequest(addresses) {
        return {
            _addresses: addresses
        };
    }

    /**
     * Validate Cardano address format (both payment and stake addresses)
     * @param {string} address - Wallet address to validate
     * @returns {boolean} Whether address is valid
     */
    isValidAddress(address) {
        // Accept both payment addresses (addr1...) and stake addresses (stake1...)
        return address && (
            (address.startsWith('addr1') && address.length >= 100) ||
            (address.startsWith('stake1') && address.length >= 50)
        );
    }
}
