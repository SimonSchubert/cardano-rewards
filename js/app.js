import { ProviderRegistry } from './provider-registry.js';
import { formatAmount, getElement, toggleElement, createTokenIcon } from './utils.js';

/**
 * Reward Checker Application
 * Main application logic using modular providers
 */
export class RewardCheckerApp {
    constructor() {
        this.providerRegistry = new ProviderRegistry();
        this.isLoading = false;
        this.currentResults = [];
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.displayProviderInfo();
        this.restoreWalletAddress();
    }

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        // Check rewards button
        getElement('.btn-primary', btn => 
            btn.addEventListener('click', () => this.checkRewards())
        );

        // Enter key in input field
        getElement('#walletAddress', input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.checkRewards();
                }
            });
            
            // Save address to local storage on input change
            input.addEventListener('input', () => {
                this.saveWalletAddress(input.value);
            });
        });
    }

    /**
     * Display information about available providers
     */
    displayProviderInfo() {
        const stats = this.providerRegistry.getProviderStats();
        console.log(`Loaded ${stats.totalProviders} reward providers:`, stats.providerNames);
        
        // Populate the services grid
        this.populateServicesGrid();
    }

    /**
     * Populate the services grid with provider information
     */
    populateServicesGrid() {
        const servicesGrid = getElement('#servicesGrid');
        if (!servicesGrid) return;

        const providers = this.providerRegistry.getAllProviders();
        servicesGrid.innerHTML = '';

        providers.forEach(provider => {
            const serviceItem = document.createElement('a');
            serviceItem.className = 'service-item';
            
            if (provider.platformUrl) {
                serviceItem.href = provider.platformUrl;
                serviceItem.target = '_blank';
                serviceItem.rel = 'noopener noreferrer';
            } else {
                serviceItem.href = '#';
                serviceItem.addEventListener('click', (e) => {
                    e.preventDefault();
                });
                serviceItem.style.cursor = 'default';
            }

            // Create icon element
            const icon = document.createElement('div');
            icon.className = 'service-icon';
            
            if (provider.icon) {
                const img = document.createElement('img');
                img.src = provider.icon;
                img.alt = `${provider.name} icon`;
                img.className = 'service-icon';
                img.onerror = () => {
                    // Fallback to text-based icon if image fails to load
                    icon.className = 'service-icon placeholder';
                    icon.textContent = provider.name.charAt(0).toUpperCase();
                    icon.removeChild(img);
                };
                icon.appendChild(img);
            } else {
                // Text-based fallback icon
                icon.className = 'service-icon placeholder';
                icon.textContent = provider.name.charAt(0).toUpperCase();
            }

            // Create name element
            const name = document.createElement('div');
            name.className = 'service-name-item';
            name.textContent = provider.name;

            serviceItem.appendChild(icon);
            serviceItem.appendChild(name);
            servicesGrid.appendChild(serviceItem);
        });
    }

    /**
     * Save wallet address to local storage
     * @param {string} address - Wallet address to save
     */
    saveWalletAddress(address) {
        if (address && address.trim()) {
            localStorage.setItem('cardano-reward-checker-address', address.trim());
        }
    }

    /**
     * Restore wallet address from local storage
     */
    restoreWalletAddress() {
        const savedAddress = localStorage.getItem('cardano-reward-checker-address');
        if (savedAddress) {
            getElement('#walletAddress', input => {
                input.value = savedAddress;
            });
        }
    }

    /**
     * Main function to check rewards across all providers
     */
    async checkRewards() {
        const input = document.getElementById('walletAddress');
        const address = input ? input.value.trim() : '';
        
        if (!address) {
            this.showError('Please enter a wallet address');
            return;
        }

        // Validate address format
        const validation = this.providerRegistry.validateAddresses(address);
        if (!validation.valid) {
            this.showError('Please enter a valid Cardano address');
            return;
        }

        // Save valid address to local storage
        this.saveWalletAddress(address);

        this.showLoading();
        this.currentResults = [];
        
        // Clear previous results
        const container = document.getElementById('resultsContainer');
        if (container) container.innerHTML = '';
        
        try {
            await this.providerRegistry.checkAllRewards(address, {
                timeout: 30000, // 30 second timeout per provider
                onResult: (result) => {
                    this.currentResults.push(result);
                    this.displayResultsInOrder();
                }
            });
        } catch (error) {
            this.showError(`Failed to check rewards: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Toggle loading state
     * @param {boolean} show - Whether to show loading state
     */
    toggleLoading(show) {
        this.isLoading = show;
        toggleElement('#loading', show);
        toggleElement('#results', !show);
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.toggleLoading(true);
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.toggleLoading(false);
    }

    /**
     * Display results from all providers
     * @param {Array} results - Results from provider registry
     */
    displayResults(results) {
        const container = document.getElementById('resultsContainer');
        if (!container) return;

        container.innerHTML = '';

        results.forEach(result => {
            const card = this.createResultCard(result);
            container.appendChild(card);
        });
    }

    /**
     * Display results in order: rewards > successful no rewards > failed
     */
    displayResultsInOrder() {
        const container = document.getElementById('resultsContainer');
        if (!container) return;

        // Sort results by priority
        const sortedResults = this.sortResultsByPriority(this.currentResults);
        
        // Clear and rebuild the container
        container.innerHTML = '';
        
        sortedResults.forEach(result => {
            const card = this.createResultCard(result);
            container.appendChild(card);
        });
    }

    /**
     * Sort results by priority: rewards > successful no rewards > failed
     * @param {Array} results - Array of provider results
     * @returns {Array} Sorted results
     */
    sortResultsByPriority(results) {
        const withRewards = [];
        const successfulNoRewards = [];
        const failed = [];

        results.forEach(result => {
            if (!result.success) {
                failed.push(result);
            } else if (result.data && result.data.tokens && result.data.tokens.length > 0) {
                // Check if any token has a non-zero amount
                const hasRewards = result.data.tokens.some(token => token.amount > 0);
                if (hasRewards) {
                    withRewards.push(result);
                } else {
                    successfulNoRewards.push(result);
                }
            } else {
                successfulNoRewards.push(result);
            }
        });

        return [...withRewards, ...successfulNoRewards, ...failed];
    }

    /**
     * Create provider name element with icon and optional link
     * @param {Object} provider - Provider object
     * @param {string} name - Display name
     * @param {string} url - Optional URL to link to
     * @returns {string} HTML string
     */
    createProviderNameElement(provider, name, url = null) {
        const iconHtml = provider?.icon ? 
            `<img src="${provider.icon}" alt="${name}" style="width: 20px; height: 20px; margin-right: 8px; vertical-align: middle;">` : '';
        
        return url ? 
            `<a href="${url}" target="_blank" style="color: inherit; text-decoration: none; display: flex; align-items: center;">${iconHtml}${name}</a>` : 
            `${iconHtml}${name}`;
    }

    /**
     * Create a result card for a single provider
     * @param {Object} result - Provider result
     * @returns {HTMLElement} Result card element
     */
    createResultCard(result) {
        const card = document.createElement('div');
        card.className = 'service-card';
        const provider = this.providerRegistry.getProvider(result.providerId);

        if (result.success) {
            const data = result.data;
            const platformUrl = data.metadata?.claimUrl;
            const nameElement = this.createProviderNameElement(provider, data.provider, platformUrl);

            card.innerHTML = `
                <div class="service-header">
                    <div class="service-name">${nameElement}</div>
                    <div class="status-badge status-success">✓ Checked</div>
                </div>
                ${this.formatTokenData(data, false)}
            `;
        } else {
            const providerName = provider?.name || result.providerId;
            const nameElement = this.createProviderNameElement(provider, providerName, provider?.platformUrl);

            card.innerHTML = `
                <div class="service-header">
                    <div class="service-name">${nameElement}</div>
                    <div class="status-badge status-error">✗ Error</div>
                </div>
                <div class="error-message">
                    ${result.error}
                </div>
            `;
        }

        return card;
    }

    /**
     * Format token data for display
     * @param {Object} data - Standardized provider response
     * @param {boolean} showClaimLink - Whether to show claim links
     * @returns {string} HTML string
     */
    formatTokenData(data, showClaimLink = true) {
        if (!data.tokens?.length) {
            return `
                <div class="reward-amount">No Rewards</div>
                <p style="color: #666; font-style: italic;">No unclaimed rewards found</p>
            `;
        }

        let html = '<div class="reward-details">';

        // Display each token
        data.tokens.forEach(token => {
            const tokenIcon = createTokenIcon(token.policyId, token.assetName, token.symbol, '24px');
            html += `
                <div class="detail-item">
                    <div class="detail-label" style="display: flex; align-items: center;">
                        ${tokenIcon}${token.symbol}
                    </div>
                    <div class="detail-value">${this.formatAmount(token.amount)} ${token.symbol}</div>
                </div>
            `;
        });

        // Add metadata if available
        const metadata = data.metadata;
        if (metadata) {
            const metadataItems = [
                { key: 'stakeCount', label: 'Active Stakes' },
                { key: 'totalRewards', label: 'Total Rewards' }
            ];

            metadataItems.forEach(item => {
                if (metadata[item.key]) {
                    html += `
                        <div class="detail-item">
                            <div class="detail-label">${item.label}</div>
                            <div class="detail-value">${metadata[item.key]}</div>
                        </div>
                    `;
                }
            });

            if (metadata.claimUrl && showClaimLink) {
                html += `
                    <div class="detail-item">
                        <div class="detail-label">Claim Rewards</div>
                        <div class="detail-value">
                            <a href="${metadata.claimUrl}" target="_blank" style="color: #667eea; text-decoration: none;">
                                🔗 Open Platform
                            </a>
                        </div>
                    </div>
                `;
            }
        }

        return html + '</div>';
    }

    /**
     * Format token amount for display
     * @param {number} amount - Token amount
     * @returns {string} Formatted amount
     */
    formatAmount(amount) {
        return formatAmount(amount);
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        alert(message); // Simple alert for now, could be enhanced with better UI
    }

    /**
     * Get current results (useful for debugging or exporting)
     * @returns {Array} Current results
     */
    getCurrentResults() {
        return this.currentResults;
    }

    /**
     * Add a custom provider at runtime
     * @param {BaseProvider} provider - Provider instance
     */
    addProvider(provider) {
        this.providerRegistry.addProvider(provider);
        this.displayProviderInfo();
    }
}
