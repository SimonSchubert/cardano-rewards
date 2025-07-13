import { isValidAddress, CORS_PROXIES } from '../utils.js';

/**
 * Base Provider Class
 * Defines the standard interface for all reward providers
 */
export class BaseProvider {
    constructor(config) {
        this.name = config.name;
        this.id = config.id;
        this.icon = config.icon || null;
        this.originalEndpoint = config.endpoint;
        this.useCorsProxy = config.useCorsProxy !== false; // Default to true
        this.method = config.method || 'POST';
        this.headers = config.headers || {};
        this.platformUrl = config.platformUrl || null;
    }

    /**
     * Get the endpoint URL, with CORS proxy if enabled
     * @returns {string} Final endpoint URL
     */
    get endpoint() {
        return this.buildUrl(this.originalEndpoint, this.method);
    }

    /**
     * Build URL with CORS proxy if enabled
     * @param {string} url - Original URL
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @returns {string} Final URL with or without CORS proxy
     */
    buildUrl(url, method = 'GET') {
        if (this.useCorsProxy && url) {
            // For POST requests through allorigins, we need to use a different approach
            // allorigins.win expects the URL as a query parameter for GET requests
            if (method === 'GET') {
                return `${CORS_PROXIES.ALLORIGINS}${url}`;
            } else {
                // For POST requests, we'll use the raw proxy approach
                // Note: This might need adjustment based on the specific CORS proxy service
                return `${CORS_PROXIES.ALLORIGINS}${url}`;
            }
        }
        return url;
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
        return await this.makeHttpRequest(this.endpoint, {
            method: this.method,
            headers: this.headers,
            body: JSON.stringify(requestBody)
        });
    }

    /**
     * Make HTTP request with common error handling and proxy response parsing
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Parsed response data
     */
    async makeHttpRequest(url, options = {}) {
        const defaultOptions = {
            mode: 'cors',
            ...options
        };

        const response = await fetch(url, defaultOptions);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await this.parseProxyResponse(response);
    }

    /**
     * Parse response from CORS proxy if needed
     * @param {Object} response - Raw response from fetch
     * @returns {Object} Parsed response data
     */
    async parseProxyResponse(response) {
        const result = await response.json();
        
        // Handle allorigins.win response format
        if (this.useCorsProxy && result.contents !== undefined) {
            // allorigins.win wraps the response in a 'contents' field
            return typeof result.contents === 'string' ? JSON.parse(result.contents) : result.contents;
        }
        
        return result;
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

    /**
     * Make HTTP GET request with query parameters
     * @param {string} queryParams - Query parameters string
     * @returns {Promise<Object>} Raw API response
     */
    async makeGetRequest(queryParams = '') {
        const fullUrl = queryParams ? `${this.originalEndpoint}?${queryParams}` : this.originalEndpoint;
        const finalUrl = this.buildUrl(fullUrl, 'GET');
        
        return await this.makeHttpRequest(finalUrl, {
            method: 'GET',
            headers: this.headers
        });
    }

    /**
     * Make HTTP POST request to a specific endpoint path
     * @param {string} path - Endpoint path to append to base URL
     * @param {Object} body - Request body
     * @returns {Promise<Object>} Raw API response
     */
    async makePostRequest(path, body) {
        const fullUrl = `${this.originalEndpoint}/${path}`;
        const finalUrl = this.buildUrl(fullUrl, 'POST');
        
        return await this.makeHttpRequest(finalUrl, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body)
        });
    }

    /**
     * Set whether to use CORS proxy
     * @param {boolean} useCorsProxy - Whether to use CORS proxy
     */
    setCorsProxy(useCorsProxy) {
        this.useCorsProxy = useCorsProxy;
    }
}
