#!/usr/bin/env bash
# WooCommerce REST API Import using curl
# Usage: bash rest-api-import-orders.sh <json_file> [target_site]

set -e

INPUT_FILE="${1:-orders_export.json}"
TARGET_SITE="${2:-shapehive}"

# API URLs
SHAPEHIVE_API="https://cms.sasanperfumes.com/wp-json/wc/v3/orders"
QA_API="https://cms.sasanperfumes.com/qa/wp-json/wc/v3/orders"
OM_API="https://cms.sasanperfumes.com/om/wp-json/wc/v3/orders"
SA_API="https://cms.sasanperfumes.com/sa/wp-json/wc/v3/orders"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  WooCommerce REST API Orders Import Tool (curl)           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Validate input file
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}❌ File not found: $INPUT_FILE${NC}"
    echo -e "${YELLOW}💡 Usage: bash rest-api-import-orders.sh <json_file> [shapehive|qa|om|sa]${NC}"
    exit 1
fi

# Get API URL based on target site
case "$TARGET_SITE" in
    shapehive)
        API_URL="$SHAPEHIVE_API"
        ;;
    qa)
        API_URL="$QA_API"
        ;;
    om)
        API_URL="$OM_API"
        ;;
    sa)
        API_URL="$SA_API"
        ;;
    *)
        echo -e "${RED}❌ Invalid target site: $TARGET_SITE${NC}"
        echo -e "${YELLOW}Valid options: shapehive, qa, om, sa${NC}"
        exit 1
        ;;
esac

# Load orders from JSON
total_orders=$(jq 'length' "$INPUT_FILE")
echo -e "📥 Importing $total_orders orders to: ${CYAN}$TARGET_SITE${NC}"
echo -e "   URL: $API_URL\n"

success=0
failed=0
counter=0

# Process each order
jq -c '.[]' "$INPUT_FILE" | while read order; do
    ((counter++))
    
    # Extract key fields
    original_id=$(echo "$order" | jq -r '.id')
    
    # Create minimal payload
    payload=$(echo "$order" | jq '{
        status: .status,
        customer_id: .customer_id,
        total: .total,
        currency: .currency,
        billing: .billing,
        shipping: .shipping,
        line_items: .line_items,
        payment_method: .payment_method,
        payment_method_title: .payment_method_title
    }')
    
    # Send to API
    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>/dev/null || echo '{"error":"connection"}')
    
    # Check response
    new_id=$(echo "$response" | jq -r '.id // "error"' 2>/dev/null)
    
    if [ "$new_id" != "error" ] && [ ! -z "$new_id" ]; then
        ((success++))
        if [ $((counter % 10)) -eq 0 ] || [ "$counter" -eq 1 ]; then
            echo -e "  ${GREEN}✓${NC} Order #$original_id → #$new_id"
        fi
    else
        ((failed++))
        error=$(echo "$response" | jq -r '.message // "Unknown error"' 2>/dev/null)
        echo -e "  ${RED}✗${NC} Order #$original_id: $error"
    fi
done

echo ""
echo -e "${GREEN}✅ Import Complete${NC}"
echo "   ✓ Successful: $success"
echo "   ✗ Failed: $failed"
echo ""
echo -e "${CYAN}📋 Verification:${NC}"
echo "   Check: https://cms.sasanperfumes.com/$([[ $TARGET_SITE != "shapehive" ]] && echo "$TARGET_SITE/")/wp-admin/admin.php?page=wc-orders"
