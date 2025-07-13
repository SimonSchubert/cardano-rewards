import { BaseProvider } from './base-provider.js';

/**
 * StrikeFinance Rewards Provider
 * Handles checking for StrikeFinance staking rewards
 */
export class StrikeFinanceProvider extends BaseProvider {
    constructor() {
        super({
            name: 'Strike Finance',
            id: 'strikefinance',
            icon: 'https://app.strikefinance.org/favicon.png',
            endpoint: 'https://app.strikefinance.org/api/staking/getStake',
            method: 'GET',
            useCorsProxy: true,
            platformUrl: 'https://app.strikefinance.org/staking',
            headers: {
                'Accept': '*/*',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Access-Control-Allow-Origin': 'https://app.strikefinance.org',
                'origin': 'https://app.strikefinance.org',
            }
        });
    }

    /**
     * Make HTTP request to StrikeFinance API
     * @param {string[]} addresses - Array of wallet addresses
     * @returns {Promise<Object>} Raw API response
     */
    async makeRequest(addresses) {
        // StrikeFinance API handles one address at a time
        const address = addresses[0];
        
        // Build query parameters
        const queryParams = `address=${encodeURIComponent(address)}`;
        
        return await this.makeGetRequest(queryParams);
    }

    /**
     * Build request - not used for GET requests, but required by base class
     * @param {string[]} addresses - Array of wallet addresses
     * @returns {Object} Empty object since we use query parameters
     */
    buildRequest(addresses) {
        return {};
    }

    /**
     * Format StrikeFinance response into standardized format
     * @param {Object} response - Raw API response
     * @returns {Object} Standardized response format
     */
    formatResponse(response) {
        const tokens = [];
        
        // Check if there are rewards or staked amounts
        if (response.rewards > 0 || response.stakedAmount > 0) {
                tokens.push({
                    symbol: 'ADA',
                    name: 'Cardano',
                    amount: response.rewards,
                    type: 'rewards',
                    status: 'claimable',
                    value_ada: response.rewards,
                    source: 'StrikeFinance Rewards'
                });
        }

        return {
            success: true,
            provider: this.name,
            tokens: tokens,
            metadata: {
                raw_response: response,
                total_staked_ada: response.stakedAmount || 0,
                total_rewards_ada: response.rewards || 0,
                platform_url: this.platformUrl
            }
        };
    }
}
