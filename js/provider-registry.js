import { SundaeLiqwidProvider } from './providers/sundae-liqwid-provider.js';
import { SundaeGeneralProvider } from './providers/sundae-general-provider.js';
import { NuvolaDigitalProvider } from './providers/nuvola-digital-provider.js';
import { MinswapProvider } from './providers/minswap-provider.js';
import { CardanoStakingProvider } from './providers/cardano-staking-provider.js';

/**
 * Provider Registry
 * Manages all reward providers and provides a unified interface
 */
export class ProviderRegistry {
    constructor() {
        this.providers = new Map();
        this.initializeProviders();
    }

    /**
     * Initialize all available providers
     */
    initializeProviders() {
        const providers = [
            new SundaeLiqwidProvider(),
            new SundaeGeneralProvider(),
            new NuvolaDigitalProvider(),
            new MinswapProvider(),
            new CardanoStakingProvider()
        ];

        providers.forEach(provider => {
            this.providers.set(provider.id, provider);
        });
    }

    /**
     * Get all registered providers
     * @returns {Array} Array of provider instances
     */
    getAllProviders() {
        return Array.from(this.providers.values());
    }

    /**
     * Get a specific provider by ID
     * @param {string} providerId - Provider ID
     * @returns {BaseProvider|null} Provider instance or null if not found
     */
    getProvider(providerId) {
        return this.providers.get(providerId) || null;
    }

    /**
     * Add a new provider to the registry
     * @param {BaseProvider} provider - Provider instance
     */
    addProvider(provider) {
        this.providers.set(provider.id, provider);
    }

    /**
     * Remove a provider from the registry
     * @param {string} providerId - Provider ID
     * @returns {boolean} True if provider was removed, false if not found
     */
    removeProvider(providerId) {
        return this.providers.delete(providerId);
    }

    /**
     * Check rewards across all providers for given addresses
     * @param {string|string[]} addresses - Single address or array of addresses
     * @param {Object} options - Options for checking rewards
     * @param {string[]} options.includeProviders - Only check these provider IDs
     * @param {string[]} options.excludeProviders - Skip these provider IDs
     * @param {number} options.timeout - Timeout in milliseconds per provider
     * @param {Function} options.onResult - Callback function called when each provider completes
     * @returns {Promise<Array>} Array of results from all providers
     */
    async checkAllRewards(addresses, options = {}) {
        const {
            includeProviders = null,
            excludeProviders = [],
            timeout = 30000,
            onResult = null
        } = options;

        const providers = this.getFilteredProviders(includeProviders, excludeProviders);

        // If we have a callback, use streaming mode
        if (onResult && typeof onResult === 'function') {
            return this.checkRewardsStreaming(addresses, providers, timeout, onResult);
        }

        // Non-streaming mode - wait for all results
        return this.checkRewardsBatch(addresses, providers, timeout);
    }

    /**
     * Get filtered providers based on include/exclude lists
     * @param {string[]|null} includeProviders - Provider IDs to include
     * @param {string[]} excludeProviders - Provider IDs to exclude
     * @returns {Array} Filtered provider instances
     */
    getFilteredProviders(includeProviders, excludeProviders) {
        return this.getAllProviders().filter(provider => {
            if (includeProviders && !includeProviders.includes(provider.id)) {
                return false;
            }
            return !excludeProviders.includes(provider.id);
        });
    }

    /**
     * Check rewards in streaming mode with immediate results
     * @param {string|string[]} addresses - Wallet addresses
     * @param {Array} providers - Provider instances
     * @param {number} timeout - Timeout per provider
     * @param {Function} onResult - Result callback
     * @returns {Promise<Array>} Empty array (results sent via callback)
     */
    async checkRewardsStreaming(addresses, providers, timeout, onResult) {
        const failedResults = [];
        let completedCount = 0;
        const totalProviders = providers.length;

        providers.forEach(async (provider) => {
            try {
                const result = await this.checkSingleProvider(provider, addresses, timeout);
                onResult(result);
                
                completedCount++;
                if (completedCount === totalProviders) {
                    failedResults.forEach(onResult);
                }
            } catch (error) {
                const resultData = {
                    providerId: provider.id,
                    success: false,
                    error: error.message
                };

                failedResults.push(resultData);
                completedCount++;
                
                if (completedCount === totalProviders) {
                    failedResults.forEach(onResult);
                }
            }
        });

        return [];
    }

    /**
     * Check rewards in batch mode waiting for all results
     * @param {string|string[]} addresses - Wallet addresses
     * @param {Array} providers - Provider instances
     * @param {number} timeout - Timeout per provider
     * @returns {Promise<Array>} All results
     */
    async checkRewardsBatch(addresses, providers, timeout) {
        const promises = providers.map(provider => 
            this.checkSingleProvider(provider, addresses, timeout)
        );

        const allResults = await Promise.allSettled(promises);
        const results = allResults.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            return {
                providerId: providers[index].id,
                success: false,
                error: result.reason?.message || 'Unknown error'
            };
        });

        // Sort successful results first, then failed results
        return [...results.filter(r => r.success), ...results.filter(r => !r.success)];
    }

    /**
     * Check rewards for a single provider with timeout
     * @param {BaseProvider} provider - Provider instance
     * @param {string|string[]} addresses - Wallet addresses
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<Object>} Provider result
     */
    async checkSingleProvider(provider, addresses, timeout) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), timeout);
        });

        const rewardPromise = provider.checkRewards(addresses);
        const result = await Promise.race([rewardPromise, timeoutPromise]);

        return {
            providerId: provider.id,
            success: true,
            data: result
        };
    }

    /**
     * Validate that all addresses are properly formatted
     * @param {string|string[]} addresses - Addresses to validate
     * @returns {Object} Validation result
     */
    validateAddresses(addresses) {
        const addressArray = Array.isArray(addresses) ? addresses : [addresses];
        const invalid = [];

        addressArray.forEach(address => {
            // Use first provider's validation method (they should all be the same)
            const firstProvider = this.getAllProviders()[0];
            if (firstProvider && !firstProvider.isValidAddress(address)) {
                invalid.push(address);
            }
        });

        return {
            valid: invalid.length === 0,
            invalidAddresses: invalid,
            validCount: addressArray.length - invalid.length,
            totalCount: addressArray.length
        };
    }

    /**
     * Get summary statistics about all providers
     * @returns {Object} Provider statistics
     */
    getProviderStats() {
        const providers = this.getAllProviders();
        
        return {
            totalProviders: providers.length,
            providerNames: providers.map(p => p.name),
            providerIds: providers.map(p => p.id)
        };
    }
}
