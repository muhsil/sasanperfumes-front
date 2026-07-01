#!/usr/bin/env bash
# WooCommerce REST API Export/Import using curl
# Usage: bash rest-api-export-orders.sh

set -e

# Configuration
SASAN_API="https://sasanperfumes.com/wp-json/wc/v3/orders"
SHAPEHIVE_API="https://cms.sasanperfumes.com/wp-json/wc/v3/orders"
OUTPUT_FILE="orders_export_$(date +%Y%m%d_%H%M%S).json"
TEMP_FILE="/tmp/orders_combined.json"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  WooCommerce REST API Orders Export Tool (curl)           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Function to export orders from API
export_orders() {
    local api_url=$1
    local output_file=$2
    local page=1
    local per_page=100
    local total_orders=0

    echo -e "${CYAN}📤 Exporting from: $api_url${NC}"
    
    # Create array file
    echo "[" > "$output_file"
    
    while true; do
        echo "  Fetching page $page..."
        
        # Get page of orders
        local url="${api_url}?page=${page}&per_page=${per_page}&status=completed,processing,pending,on-hold"
        
        response=$(curl -s "$url" -H "Content-Type: application/json")
        
        # Check if empty response
        if [ -z "$response" ] || [ "$response" = "[]" ]; then
            break
        fi
        
        # Append to output (skip array brackets)
        local content=$(echo "$response" | jq '.[] | @json' -r)
        
        if [ -z "$content" ]; then
            break
        fi
        
        # Count orders
        local count=$(echo "$response" | jq 'length')
        total_orders=$((total_orders + count))
        
        echo -e "    ${GREEN}✓ Got $count orders (total: $total_orders)${NC}"
        
        # Add to file
        if [ "$page" -gt 1 ]; then
            echo "," >> "$output_file"
        fi
        echo "$content" | sed '$!s/$/,/' >> "$output_file"
        
        # Stop if less than per_page (last page)
        if [ "$count" -lt "$per_page" ]; then
            break
        fi
        
        ((page++))
    done
    
    # Close JSON array
    echo "]" >> "$output_file"
    
    echo -e "${GREEN}✅ Exported $total_orders orders${NC}"
    echo -e "   File: $output_file"
    echo ""
}

# Function to import orders to API
import_orders() {
    local api_url=$1
    local input_file=$2
    local target_site=${3:-shapehive}

    echo -e "${CYAN}📥 Importing to: $api_url${NC}"
    echo "   Target: $target_site"
    echo ""
    
    local success=0
    local failed=0
    local total=$(jq 'length' "$input_file")
    
    # Iterate through orders
    jq -c '.[]' "$input_file" | while read order; do
        
        # Create order payload
        local payload=$(echo "$order" | jq '{
            status: .status,
            customer_id: .customer_id,
            total: .total,
            currency: .currency,
            billing: .billing,
            shipping: .shipping,
            line_items: .line_items,
            payment_method: .payment_method
        }')
        
        # Send to API
        local response=$(curl -s -X POST "$api_url" \
            -H "Content-Type: application/json" \
            -d "$payload")
        
        local new_id=$(echo "$response" | jq -r '.id // "error"')
        local original_id=$(echo "$order" | jq -r '.id')
        
        if [ "$new_id" != "error" ] && [ ! -z "$new_id" ]; then
            ((success++))
            echo -e "  ${GREEN}✓${NC} Order #${original_id} → #${new_id}"
        else
            ((failed++))
            echo -e "  ${RED}✗${NC} Order #${original_id} failed"
        fi
        
        # Show progress every 10
        if [ $((success + failed)) -eq 10 ]; then
            echo "  ..."
        fi
        
    done
    
    echo ""
    echo -e "${GREEN}✅ Import complete: $success successful, $failed failed${NC}"
}

# MAIN EXECUTION

# Step 1: Export
export_orders "$SASAN_API" "$OUTPUT_FILE"

# Show instructions
echo -e "${CYAN}📋 Next Steps:${NC}"
echo "1. Review the exported data (optional):"
echo "   jq . $OUTPUT_FILE | head -50"
echo ""
echo "2. Import to ShapeHive:"
echo "   bash rest-api-import-orders.sh $OUTPUT_FILE"
echo ""
echo -e "${GREEN}✅ Export complete!${NC}"
