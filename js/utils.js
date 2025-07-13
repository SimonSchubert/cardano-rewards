/**
 * Utility functions for the reward checker application
 */

/**
 * Format amounts for display with appropriate precision
 * @param {number} amount - Token amount
 * @returns {string} Formatted amount
 */
export function formatAmount(amount) {
    if (amount === 0) return '0';
    if (amount < 0.000001) return amount.toString();
    if (amount < 1) return amount.toFixed(6);
    if (amount < 1000) return amount.toFixed(3);
    return amount.toLocaleString();
}

/**
 * Validate Cardano address format
 * @param {string} address - Wallet address to validate
 * @returns {boolean} Whether address is valid
 */
export function isValidAddress(address) {
    return address && address.startsWith('addr1') && address.length >= 100;
}

/**
 * Safe element query with optional callback
 * @param {string} selector - CSS selector
 * @param {Function} callback - Optional callback if element exists
 * @returns {HTMLElement|null} Element or null
 */
export function getElement(selector, callback = null) {
    const element = document.querySelector(selector);
    if (element && callback) {
        callback(element);
    }
    return element;
}

/**
 * Toggle element visibility
 * @param {string} selector - CSS selector
 * @param {boolean} show - Whether to show the element
 */
export function toggleElement(selector, show) {
    const element = document.querySelector(selector);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

/**
 * Create token icon element with fallback
 * @param {string} policyId - Token policy ID
 * @param {string} assetName - Token asset name
 * @param {string} symbol - Token symbol for fallback
 * @param {string} size - Icon size (default: '20px')
 * @returns {string} HTML string for token icon
 */
export function createTokenIcon(policyId, assetName = '', symbol = '', size = '20px') {
    let iconUrl;
    
    // Handle ADA/lovelace tokens
    if (!policyId || policyId.toLowerCase() === 'lovelace' || policyId.toLowerCase() === 'ada' || 
        symbol.toLowerCase() === 'ada' || symbol.toLowerCase() === 'lovelace') {
        iconUrl = 'https://storage.googleapis.com/dexhunter-images/tokens/cardano.png';
    } else {
        const tokenId = policyId + assetName;
        iconUrl = `https://storage.googleapis.com/dexhunter-images/tokens/${tokenId}.webp`;
    }
    
    return `<img 
        src="${iconUrl}" 
        alt="${symbol}" 
        class="token-icon"
        style="
            width: ${size}; 
            height: ${size}; 
            margin-right: 8px; 
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
        "
        onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';"
    ><span class="token-symbol-fallback" style="
        display: none;
        align-items: center;
        justify-content: center;
        width: ${size};
        height: ${size};
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        font-size: 10px;
        font-weight: bold;
        margin-right: 8px;
        flex-shrink: 0;
    ">${symbol.substring(0, 2).toUpperCase()}</span>`;
}

/**
 * Generate token icon URL from token identifier
 * @param {string|Object} tokenData - Token identifier string or token object
 * @returns {string} Icon URL
 */
export function getTokenIconUrl(tokenData) {
    let tokenId;
    
    if (typeof tokenData === 'string') {
        // Direct token ID (Nuvola format)
        tokenId = tokenData;
    } else if (tokenData && typeof tokenData === 'object') {
        // Token object (SundaeSwap format)
        if (tokenData.policyId && tokenData.assetName) {
            // Convert hex asset name to string if needed
            const assetName = tokenData.assetName.startsWith('0x') 
                ? tokenData.assetName.slice(2) 
                : tokenData.assetName;
            tokenId = tokenData.policyId + assetName;
        } else if (tokenData.assetId) {
            // Use assetId directly, remove dots
            tokenId = tokenData.assetId.replace(/\./g, '');
        } else if (tokenData.id) {
            // Use id directly, remove dots
            tokenId = tokenData.id.replace(/\./g, '');
        } else if (tokenData.unit) {
            // Use unit directly
            tokenId = tokenData.unit;
        }
    }

    if (!tokenId || tokenId.toLowerCase() === 'lovelace' || tokenId.toLowerCase() === 'ada') {
        // Return ADA icon for native token 
        return 'https://storage.googleapis.com/dexhunter-images/tokens/cardano.png';
    }
    
    return `https://storage.googleapis.com/dexhunter-images/tokens/${tokenId}.webp`;
}

/**
 * Parse token identifier into policy ID and asset name
 * @param {string} tokenId - Full token identifier
 * @returns {Object} Object with policyId and assetName
 */
export function parseTokenId(tokenId) {
    if (!tokenId || tokenId === 'lovelace') {
        return { policyId: '', assetName: '', isAda: true };
    }
    
    // Cardano policy IDs are 56 characters (28 bytes in hex)
    const policyIdLength = 56;
    
    if (tokenId.length <= policyIdLength) {
        // Only policy ID, no asset name
        return { policyId: tokenId, assetName: '', isAda: false };
    }
    
    const policyId = tokenId.substring(0, policyIdLength);
    const assetName = tokenId.substring(policyIdLength);
    
    return { policyId, assetName, isAda: false };
}

/**
 * Convert asset name from hex to string if it's valid ASCII
 * @param {string} hexAssetName - Hex encoded asset name
 * @returns {string} Human readable asset name or original hex
 */
export function hexToString(hexAssetName) {
    if (!hexAssetName) return '';
    
    try {
        let str = '';
        for (let i = 0; i < hexAssetName.length; i += 2) {
            const hexChar = hexAssetName.substr(i, 2);
            const charCode = parseInt(hexChar, 16);
            
            // Only convert if it's printable ASCII
            if (charCode >= 32 && charCode <= 126) {
                str += String.fromCharCode(charCode);
            } else {
                // If any character is not printable ASCII, return original hex
                return hexAssetName;
            }
        }
        return str;
    } catch (e) {
        return hexAssetName;
    }
}
