import { BaseProvider } from './base-provider.js';

/**
 * Minswap Rewards Provider
 * Handles reward checking for Minswap staking and liquid staking positions
 */
export class MinswapProvider extends BaseProvider {
    constructor() {
        super({
            name: 'Minswap',
            id: 'minswap',
            icon: 'https://minswap.org/favicon.ico',
            endpoint: 'https://monorepo-mainnet-prod.minswap.org/graphql',
            method: 'POST',
            useCorsProxy: true,
            platformUrl: 'https://minswap.org',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'access-control-allow-origin': 'https://minswap.org',
                'origin': 'https://minswap.org',
            }
        });
    }

    /**
     * Build GraphQL request payload for Minswap API
     * @param {string[]} addresses - Array of wallet addresses
     * @returns {Object} GraphQL request payload
     */
    buildRequest(addresses) {
        // Minswap API only handles one address at a time, so use the first one
        const address = addresses[0];
        
        return {
            query: `query PortfolioMinStakingPosition($address: String!) {
  portfolioMinStakingPosition(address: $address) {
    __typename
    id
    version
    amountAsset {
      amount
      asset {
        ...allMetadata
      }
    }
    duration {
      duration
      multiplier
    }
    endAt
    rewardPercent
    netAdaValue
    pendingRewards {
      asset {
        ...allMetadata
        ...marketData
      }
      reward
    }
    stakedAssetAdaValue
    pnl24H
  }
  portfolioLiquidStakingPosition(address: $address) {
    __typename
    amountAsset {
      amount
      asset {
        ...allMetadata
      }
    }
    id
    netAdaValue
    pendingRewards {
      reward
      asset {
        ...allMetadata
        ...marketData
      }
    }
    stakeAt
    rewardPercent
    stakedAssetAdaValue
    pnl24H
  }
}

fragment allMetadata on Asset {
  __typename
  currencySymbol
  tokenName
  metadata {
    decimals
    description
    name
    ticker
    url
    isVerified
  }
}

fragment marketData on Asset {
  marketData {
    marketCap
    volume24h
    price
    priceChange24h
  }
}`,
            variables: {
                address: address
            }
        };
    }

    /**
     * Format Minswap response into standard token format
     * @param {Object} response - Raw GraphQL response
     * @returns {Object} Standardized response format
     */
    formatResponse(response) {
        const tokens = [];
        let totalRewards = 0;

        if (response.data) {
            // Process regular staking positions
            if (response.data.portfolioMinStakingPosition) {
                response.data.portfolioMinStakingPosition.forEach(position => {
                    if (position.pendingRewards) {
                        this.processPendingRewards(position.pendingRewards, tokens);
                    }
                });
            }

            // Process liquid staking positions
            if (response.data.portfolioLiquidStakingPosition) {
                response.data.portfolioLiquidStakingPosition.forEach(position => {
                    if (position.pendingRewards) {
                        this.processPendingRewards(position.pendingRewards, tokens);
                    }
                });
            }

            // Calculate total rewards
            totalRewards = tokens.reduce((sum, token) => sum + token.amount, 0);
        }

        return {
            success: true,
            provider: this.name,
            tokens: tokens,
            totalRewards: totalRewards,
            metadata: {
                endpoint: this.endpoint,
                timestamp: new Date().toISOString(),
                rawResponse: response
            }
        };
    }

    /**
     * Process pending rewards from a position
     * @param {Array} pendingRewards - Array of pending reward objects
     * @param {Array} tokens - Array to append processed tokens to
     */
    processPendingRewards(pendingRewards, tokens) {
        pendingRewards.forEach(reward => {
            if (reward.reward > 0) {
                const asset = reward.asset;
                const metadata = asset.metadata;
                const decimals = metadata.decimals || 6;
                
                // Convert from smallest unit to human readable amount
                const amount = reward.reward / Math.pow(10, decimals);
                
                // Determine token symbol and name
                let symbol = metadata.ticker || metadata.name;
                let name = metadata.name;
                
                // Handle ADA (native token)
                if (!asset.currencySymbol && !asset.tokenName) {
                    symbol = 'ADA';
                    name = 'Cardano';
                }
                
                // Only include rewards with meaningful amounts
                if (amount > 0.000001) {
                    // Check if we already have this token in our results
                    const existingToken = tokens.find(t => t.symbol === symbol);
                    
                    if (existingToken) {
                        existingToken.amount += amount;
                    } else {
                        tokens.push({
                            symbol: symbol,
                            name: name,
                            amount: amount,
                            decimals: decimals,
                            description: metadata.description,
                            verified: metadata.isVerified,
                            url: metadata.url,
                            policyId: asset.currencySymbol || 'ADA',
                            assetName: asset.tokenName || '',
                            marketData: asset.marketData ? {
                                price: parseFloat(asset.marketData.price || 0),
                                priceChange24h: parseFloat(asset.marketData.priceChange24h || 0),
                                marketCap: parseFloat(asset.marketData.marketCap || 0),
                                volume24h: parseFloat(asset.marketData.volume24h || 0)
                            } : null
                        });
                    }
                }
            }
        });
    }

    /**
     * Override checkRewards to handle single address limitation
     * @param {string|string[]} addresses - Single address or array of addresses
     * @returns {Promise<Object>} Standardized reward response
     */
    async checkRewards(addresses) {
        const addressArray = Array.isArray(addresses) ? addresses : [addresses];
        
        // Minswap API only supports one address at a time
        if (addressArray.length === 0) {
            throw new Error('No address provided');
        }

        // Validate the first address
        if (!this.isValidAddress(addressArray[0])) {
            throw new Error('Invalid Cardano address format');
        }

        try {
            const response = await this.makeRequest([addressArray[0]]);
            return this.formatResponse(response);
        } catch (error) {
            throw new Error(`${this.name}: ${error.message}`);
        }
    }
}
