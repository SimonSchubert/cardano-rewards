import { isValidAddress } from '../utils.js';

/**
 * Base Provider Class
 * Defines the standard interface for all reward providers
 */
export class BaseProvider {
    constructor(config) {
        this.name = config.name;
        this.id = config.id;
        this.icon = config.icon || null;
        this.endpoint = config.endpoint;
        this.method = config.method || 'POST';
        this.headers = config.headers || {};
        this.platformUrl = config.platformUrl || null;
    }

    /**
     * Standard method to check rewards for wallet addresses
     * @param {string|string[]} addresses - Single address or array of addresses
     * @returns {Promise<Object>} Standardized reward response
     */
    async checkRewards(addresses) {
        try {
            const addressArray = Array.isArray(addresses) ? addresses : [addresses];
            const response = await this.makeRequest(addressArray);
            return this.formatResponse(response);
        } catch (error) {
            throw new Error(`${this.name}: ${error.message}`);
        }
    }

    /**
     * Make HTTP request to the provider's API
     * @param {string[]} addresses - Array of wallet addresses
     * @returns {Promise<Object>} Raw API response
     */
    async makeRequest(addresses) {
        const requestBody = this.buildRequest(addresses);
        
        const response = await fetch(this.endpoint, {
            method: this.method,
            headers: this.headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Build request payload for the provider's API
     * Override this method in child classes
     * @param {string[]} addresses - Array of wallet addresses
     * @returns {Object} Request payload
     */
    buildRequest(addresses) {
        return { addresses };
    }

    /**
     * Format the provider's response into a standard format
     * Override this method in child classes
     * @param {Object} response - Raw API response
     * @returns {Object} Standardized response format
     */
    formatResponse(response) {
        return {
            success: true,
            provider: this.name,
            tokens: [],
            metadata: response
        };
    }

    /**
     * Validate Cardano address format
     * @param {string} address - Wallet address to validate
     * @returns {boolean} Whether address is valid
     */
    isValidAddress(address) {
        return isValidAddress(address);
    }
}
