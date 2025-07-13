import { BaseProvider } from './base-provider.js';

/**
 * SundaeSwap Liqwid Rewards Provider
 * Handles reward checking for Liqwid rewards through SundaeSwap
 */
export class SundaeLiqwidProvider extends BaseProvider {
    constructor() {
        super({
            name: 'Liqwid',
            id: 'sundae-liqwid',
            icon: 'https://v2.liqwid.finance/favicon.png',
            endpoint: 'https://api.sundae-rewards.sundaeswap.finance/api/v1/liqwid/rewards',
            method: 'POST',
            platformUrl: 'https://liqwid-rewards.sundaeswap.finance',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'content-type': 'application/json',
                'origin': 'https://liqwid-rewards.sundaeswap.finance'
            }
        });
    }

    /**
     * Build request payload for SundaeSwap Liqwid API
     * @param {string[]} addresses - Array of wallet addresses
     * @returns {Object} Request payload
     */
    buildRequest(addresses) {
        return { addresses };
    }

    /**
     * Format SundaeSwap Liqwid response into standard token format
     * @param {Object} response - Raw API response
     * @returns {Object} Standardized response format
     */
    formatResponse(response) {
        const tokens = [];
        let totalLQ = 0;
        let rewardCount = 0;

        if (response.rewards && typeof response.rewards === 'object') {
            // Iterate through all addresses in the rewards object
            Object.keys(response.rewards).forEach(address => {
                const addressRewards = response.rewards[address];
                if (Array.isArray(addressRewards)) {
                    addressRewards.forEach(reward => {
                        // LQ tokens have 6 decimals, so divide by 1,000,000
                        const lqAmount = reward.amount / 1000000;
                        totalLQ += lqAmount;
                        rewardCount++;
                    });
                }
            });

            if (totalLQ > 0) {
                tokens.push({
                    symbol: 'LQ',
                    name: 'Liqwid Token',
                    amount: totalLQ,
                    unit: 'lovelace', // Base unit
                    decimals: 6,
                    rewardCount: rewardCount,
                    policyId: '5d16cc1a177b5d9ba9cfa9793b07e60f1fb70fea1f8aef064415d114',
                    assetName: '494147'
                });
            }
        }

        return {
            success: true,
            provider: this.name,
            tokens: tokens,
            metadata: {
                totalRewards: rewardCount,
                claimUrl: 'https://liqwid-rewards.sundaeswap.finance',
                rawResponse: response
            }
        };
    }
}
