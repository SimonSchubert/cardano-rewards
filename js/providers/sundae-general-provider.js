import { BaseProvider } from './base-provider.js';

/**
 * SundaeSwap General Rewards Provider
 * Handles general reward checking through SundaeSwap
 */
export class SundaeGeneralProvider extends BaseProvider {
    constructor() {
        super({
            name: 'SundaeSwap',
            id: 'sundae-general',
            icon: 'https://app.sundae.fi/images/favicon.png',
            endpoint: 'https://api.sundae.fi/graphql',
            method: 'POST',
            useCorsProxy: false,
            platformUrl: 'https://sundaeswap.finance',
            headers: {
                'accept': '*/*',
                'content-type': 'application/json',
                'origin': 'https://app.sundae.fi',
                'referer': 'https://app.sundae.fi/'
            }
        });
    }

    /**
     * Build GraphQL request payload for SundaeSwap API
     * @param {string[]} addresses - Array of wallet addresses
     * @returns {Object} GraphQL request payload
     */
    buildRequest(addresses) {
        const address = addresses[0]; // Use first address
        
        return {
            query: `query fetchPositions($address: String!) {
                portfolio(address: $address) {
                    liquidity {
                        ...LiquidityBrambleFragment
                    }
                }
            }

            fragment LiquidityBrambleFragment on Liquidity {
                fees {
                    assetA {
                        asset {
                            ...AssetBrambleFragment
                        }
                        quantity
                    }
                    assetB {
                        asset {
                            ...AssetBrambleFragment
                        }
                        quantity
                    }
                }
                pool {
                    ...PoolBrambleFragment
                }
                quantity {
                    asset {
                        ...AssetBrambleFragment
                    }
                    quantity
                }
            }

            fragment AssetBrambleFragment on Asset {
                id
                assetId: id
                policyId
                decimals
                ticker
                name
                logo
                assetName
            }

            fragment PoolBrambleFragment on Pool {
                id
                assetA {
                    ...AssetBrambleFragment
                }
                assetB {
                    ...AssetBrambleFragment
                }
                version
            }`,
            variables: {
                address: address
            },
            operationName: "fetchPositions"
        };
    }

    /**
     * Format SundaeSwap GraphQL response into standard token format
     * @param {Object} response - Raw GraphQL response
     * @returns {Object} Standardized response format
     */
    formatResponse(response) {
        const tokens = [];
        
        if (!response.data || !response.data.portfolio || !response.data.portfolio.liquidity) {
            return {
                success: true,
                provider: this.name,
                tokens: tokens,
                metadata: {
                    claimUrl: 'https://app.sundae.fi/',
                    totalPositions: 0
                }
            };
        }

        const liquidityPositions = response.data.portfolio.liquidity;
        let totalPositions = 0;
        const feesByAsset = new Map();

        // Process each liquidity position
        liquidityPositions.forEach(position => {
            if (position.fees) {
                totalPositions++;
                
                // Process asset A fees
                if (position.fees.assetA && position.fees.assetA.quantity && parseFloat(position.fees.assetA.quantity) > 0) {
                    const asset = position.fees.assetA.asset;
                    const quantity = parseFloat(position.fees.assetA.quantity);
                    const ticker = asset.ticker || asset.name || asset.assetName || 'UNKNOWN';
                    
                    if (feesByAsset.has(ticker)) {
                        feesByAsset.set(ticker, {
                            ...feesByAsset.get(ticker),
                            amount: feesByAsset.get(ticker).amount + quantity
                        });
                    } else {
                        feesByAsset.set(ticker, {
                            symbol: ticker,
                            name: asset.name || ticker,
                            amount: quantity,
                            decimals: asset.decimals || 0,
                            logo: asset.logo,
                            policyId: asset.policyId || 'ADA',
                            assetName: asset.assetName || ''
                        });
                    }
                }
                
                // Process asset B fees
                if (position.fees.assetB && position.fees.assetB.quantity && parseFloat(position.fees.assetB.quantity) > 0) {
                    const asset = position.fees.assetB.asset;
                    const quantity = parseFloat(position.fees.assetB.quantity);
                    const ticker = asset.ticker || asset.name || asset.assetName || 'UNKNOWN';
                    
                    if (feesByAsset.has(ticker)) {
                        feesByAsset.set(ticker, {
                            ...feesByAsset.get(ticker),
                            amount: feesByAsset.get(ticker).amount + quantity
                        });
                    } else {
                        feesByAsset.set(ticker, {
                            symbol: ticker,
                            name: asset.name || ticker,
                            amount: quantity,
                            decimals: asset.decimals || 0,
                            logo: asset.logo,
                            policyId: asset.policyId || 'ADA',
                            assetName: asset.assetName || ''
                        });
                    }
                }
            }
        });

        // Convert fees map to tokens array
        feesByAsset.forEach(fee => {
            if (fee.amount > 0) {
                // Convert amount based on decimals
                const adjustedAmount = fee.amount / Math.pow(10, fee.decimals);
                
                tokens.push({
                    symbol: fee.symbol,
                    name: fee.name,
                    amount: adjustedAmount,
                    decimals: fee.decimals,
                    logo: fee.logo,
                    policyId: fee.policyId,
                    assetName: fee.assetName
                });
            }
        });

        return {
            success: true,
            provider: this.name,
            tokens: tokens,
            metadata: {
                claimUrl: 'https://app.sundae.fi/',
                totalPositions: totalPositions,
                liquidityPositions: liquidityPositions.length
            }
        };
    }
}
