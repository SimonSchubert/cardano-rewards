import { BaseProvider } from './base-provider.js';

/**
 * Nuvola Digital Staking Provider
 * Handles staking reward checking through Nuvola Digital
 */
export class NuvolaDigitalProvider extends BaseProvider {
    constructor() {
        super({
            name: 'Nuvola Digital',
            id: 'nuvola-digital',
            icon: 'https://app.nuvoladigital.io/_next/image/?url=https%3A%2F%2Fik.imagekit.io%2Fpizzli%2FCMS%2Fproduction%2Fsites%2F359%2Flogo.png&w=256&q=75',
            endpoint: 'https://us-central1-anvil-6fe83.cloudfunctions.net/getStakesV2',
            method: 'POST',
            useCorsProxy: true,
            platformUrl: 'https://app.nuvoladigital.io',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'content-type': 'application/json',
                'origin': 'https://app.nuvoladigital.io',
                'access-control-allow-origin': 'https://app.nuvoladigital.io'
            }
        });

        // Token name mapping for better display
        this.tokenMap = {
            '5d16cc1a177b5d9ba9cfa9793b07e60f1fb70fea1f8aef064415d114494147': 'IAG',
            'b6a7467ea1deb012808ef4e87b5ff371e85f7142d7b356a40d9b42a0436f726e75636f70696173205b76696120436861696e506f72742e696f5d': 'COPI',
            'c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad0014df105553444d': 'USDM',
            'a3931691f5c4e65d01c429e473d0dd24c51afdb6daf88e632a6c1e516f7263666178746f6b656e': 'FACT'
        };
    }

    /**
     * Build request payload for Nuvola Digital API
     * @param {string[]} addresses - Array of wallet addresses
     * @returns {Object} Request payload
     */
    buildRequest(addresses) {
        // Nuvola requires payment key hash, not the full address
        const address = addresses[0]; // Use first address for now
        
        return {
            stakeCollectionId: 60,
            changeAddress: address
        };
    }

    /**
     * Convert Cardano address to payment key hash
     * Note: This is a simplified implementation for demo purposes
     * @param {string} address - Cardano wallet address
     * @returns {string} Payment key hash
     */
    convertAddressToKeyHash(address) {
        return address;
    }

    /**
     * Format Nuvola Digital response into standard token format
     * @param {Object} response - Raw API response
     * @returns {Object} Standardized response format
     */
    formatResponse(response) {
        const tokens = [];
        let stakeCount = 0;

        if (response.success && response.stakes && Array.isArray(response.stakes)) {
            stakeCount = response.stakes.length;
            const totalRewards = {};

            // Process all stakes
            response.stakes.forEach(stake => {
                if (stake.result && stake.result.total) {
                    stake.result.total.forEach(reward => {
                        const unit = reward.unit;
                        const quantity = reward.quantity;
                        
                        if (totalRewards[unit]) {
                            totalRewards[unit] += quantity;
                        } else {
                            totalRewards[unit] = quantity;
                        }
                    });
                }
            });

            // Convert to token format
            Object.entries(totalRewards).forEach(([unit, quantity]) => {
                const tokenName = this.getTokenName(unit);
                const amount = this.formatTokenAmount(quantity, unit);
                
                tokens.push({
                    symbol: tokenName,
                    name: tokenName,
                    amount: amount,
                    unit: unit,
                    decimals: 6, // Most Cardano tokens use 6 decimals
                    rawQuantity: quantity,
                    policyId: unit === 'lovelace' ? 'ADA' : unit,
                    assetName: unit === 'lovelace' ? '' : ''
                });
            });
        }

        return {
            success: true,
            provider: this.name,
            tokens: tokens,
            metadata: {
                stakeCount: stakeCount,
                claimUrl: 'https://app.nuvoladigital.io',
                rawResponse: response
            }
        };
    }

    /**
     * Get human-readable token name from unit
     * @param {string} unit - Token unit identifier
     * @returns {string} Token name
     */
    getTokenName(unit) {
        return this.tokenMap[unit] || 'Unknown Token';
    }

    /**
     * Format token amount based on decimals
     * @param {number} quantity - Raw token quantity
     * @param {string} unit - Token unit identifier
     * @returns {number} Formatted amount
     */
    formatTokenAmount(quantity, unit) {
        const decimals = 6; // Most Cardano tokens use 6 decimals
        const amount = quantity / Math.pow(10, decimals);
        
        if (amount < 0.000001) {
            return quantity; // Return raw amount for very small numbers
        }
        
        return parseFloat(amount.toFixed(6));
    }

}
