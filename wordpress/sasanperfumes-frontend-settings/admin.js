jQuery(document).ready(function($) {

    /* ================================================================
       SHARED HELPERS
       ================================================================ */

    /** Build product preview card HTML */
    function productCard(p) {
        var cat = p.category || '';
        return '<div style="display:flex;align-items:center;padding:10px;background:#f0f7ff;border:1px solid #c5d9ed;border-radius:4px;margin-top:8px;">' +
            (p.image ? '<img src="' + p.image + '" style="width:50px;height:50px;object-fit:cover;border-radius:4px;margin-right:12px;">' : '') +
            '<div><strong>' + p.name + '</strong>' +
            (cat ? '<br><small style="color:#0073aa;">Category: ' + cat + '</small>' : '') +
            '<br><small style="color:#666;">Slug: ' + p.slug + ' &middot; ' + p.price +
            (p.sku ? ' &middot; SKU: ' + p.sku : '') + '</small></div>' +
            '<button type="button" class="button sasanperfumes-product-clear" style="margin-left:auto;color:red;">\u2715</button></div>';
    }

    /** Build product search-result row HTML */
    function productRow(p) {
        var safe = $('<span>').text(p.name).html();
        return '<div class="sasanperfumes-product-result"' +
            ' data-slug="' + p.slug + '"' +
            ' data-name="' + safe + '"' +
            ' data-price="' + p.price + '"' +
            ' data-sku="' + (p.sku||'') + '"' +
            ' data-image="' + (p.image||'') + '"' +
            ' data-stock="' + p.stock + '"' +
            ' data-category="' + (p.category||'') + '"' +
            ' style="display:flex;align-items:center;padding:8px;cursor:pointer;border-bottom:1px solid #eee;">' +
            '<img src="' + (p.image||'') + '" style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:10px;' + (p.image ? '' : 'display:none;') + '">' +
            '<div style="flex:1;"><strong>' + p.name + '</strong>' +
            (p.category ? '<br><small style="color:#0073aa;">Category: ' + p.category + '</small>' : '') +
            '<br><small style="color:#666;">' + p.price + (p.sku ? ' &middot; SKU: ' + p.sku : '') + ' &middot; ' + p.stock + '</small></div></div>';
    }

    /** Reindex a repeater container (updates [n] indices in field names) */
    function reindexRepeater(container, itemClass, label) {
        container.find('.' + itemClass).each(function(i) {
            $(this).find('h4').contents().first().replaceWith(label + ' ' + (i + 1) + ' ');
            $(this).find('input, textarea, select').each(function() {
                var n = $(this).attr('name');
                if (n) $(this).attr('name', n.replace(/\[\d+\]/, '[' + i + ']'));
                var id = $(this).attr('id');
                if (id) $(this).attr('id', id.replace(/_\d+_/, '_' + i + '_'));
            });
            $(this).find('.sasanperfumes-upload-btn, .sasanperfumes-remove-btn').each(function() {
                var t = $(this).data('target'), p = $(this).data('preview');
                if (t) $(this).attr('data-target', String(t).replace(/_\d+_/, '_' + i + '_'));
                if (p) $(this).attr('data-preview', String(p).replace(/_\d+_/, '_' + i + '_'));
            });
            $(this).find('.sasanperfumes-preview').each(function() {
                var id = $(this).attr('id');
                if (id) $(this).attr('id', id.replace(/_\d+_/, '_' + i + '_'));
            });
        });
    }

    /* ================================================================
       PRODUCT SELECTOR - AJAX search with preview
       ================================================================ */
    var searchTimer = null;

    // Search input
    $(document).on('input', '.sasanperfumes-product-search', function() {
        var input = $(this), wrap = input.closest('.sasanperfumes-product-selector');
        var results = wrap.find('.sasanperfumes-product-results'), q = input.val().trim();
        clearTimeout(searchTimer);
        if (q.length < 2) { results.hide().empty(); return; }
        searchTimer = setTimeout(function() {
            $.get(sasanperfumesAdmin.ajaxurl, { action: 'sasanperfumes_search_products', nonce: sasanperfumesAdmin.nonce, q: q }, function(res) {
                if (!res.success || !res.data.length) {
                    results.html('<div style="padding:8px;color:#999;">No products found</div>').show();
                    return;
                }
                results.html($.map(res.data, productRow).join('')).show();
            });
        }, 300);
    });

    // Select product
    $(document).on('click', '.sasanperfumes-product-result', function() {
        var el = $(this), wrap = el.closest('.sasanperfumes-product-selector');
        wrap.find('.sasanperfumes-product-slug-input').val(el.data('slug'));
        wrap.find('.sasanperfumes-product-search').val('');
        wrap.find('.sasanperfumes-product-results').hide().empty();
        wrap.find('.sasanperfumes-product-preview').html(productCard({
            slug: el.data('slug'), name: el.data('name'), price: el.data('price'),
            sku: el.data('sku'), image: el.data('image'), category: el.data('category')
        }));
    });

    // Clear product
    $(document).on('click', '.sasanperfumes-product-clear', function(e) {
        e.preventDefault();
        var wrap = $(this).closest('.sasanperfumes-product-selector');
        wrap.find('.sasanperfumes-product-slug-input').val('');
        wrap.find('.sasanperfumes-product-preview').empty();
    });

    // Hide results on outside click
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.sasanperfumes-product-selector').length) $('.sasanperfumes-product-results').hide();
    });

    // Page load: fetch previews for pre-filled slugs
    $('.sasanperfumes-product-selector').each(function() {
        var wrap = $(this), slug = wrap.find('.sasanperfumes-product-slug-input').val();
        if (!slug) return;
        $.get(sasanperfumesAdmin.ajaxurl, { action: 'sasanperfumes_search_products', nonce: sasanperfumesAdmin.nonce, q: slug }, function(res) {
            if (!res.success) return;
            var match = null;
            $.each(res.data, function(i, p) { if (p.slug === slug) { match = p; return false; } });
            if (match) wrap.find('.sasanperfumes-product-preview').html(productCard(match));
        });
    });

    /* ================================================================
       MEDIA LIBRARY - Image upload / remove
       ================================================================ */
    $(document).on('click', '.sasanperfumes-upload-btn', function(e) {
        e.preventDefault();
        var btn = $(this), target = $(btn.data('target')), preview = $(btn.data('preview'));
        var frame = wp.media({ title: 'Select Image', button: { text: 'Use Image' }, multiple: false });
        frame.on('select', function() {
            var a = frame.state().get('selection').first().toJSON();
            target.val(a.url);
            preview.html('<img src="' + a.url + '" style="max-width:300px;max-height:150px;display:block;margin-top:10px;">');
            btn.siblings('.sasanperfumes-remove-btn').show();
        });
        frame.open();
    });

    $(document).on('click', '.sasanperfumes-remove-btn', function(e) {
        e.preventDefault();
        var btn = $(this);
        $(btn.data('target')).val('');
        $(btn.data('preview')).html('');
        btn.hide();
    });

    // Logo upload (stores attachment ID)
    $(document).on('click', '.sasanperfumes-logo-upload-btn', function(e) {
        e.preventDefault();
        var btn = $(this), tid = $(btn.data('target-id')), turl = $(btn.data('target-url')), preview = $(btn.data('preview'));
        var frame = wp.media({ title: 'Select Logo', button: { text: 'Use as Logo' }, multiple: false });
        frame.on('select', function() {
            var a = frame.state().get('selection').first().toJSON();
            tid.val(a.id); turl.val(a.url);
            preview.html('<img src="' + a.url + '" style="max-width:300px;max-height:150px;display:block;margin-top:10px;">');
            btn.siblings('.sasanperfumes-logo-remove-btn').show();
        });
        frame.open();
    });

    $(document).on('click', '.sasanperfumes-logo-remove-btn', function(e) {
        e.preventDefault();
        var btn = $(this);
        $(btn.data('target-id')).val('0');
        $(btn.data('target-url')).val('');
        $(btn.data('preview')).html('');
        btn.hide();
    });

    /* ================================================================
       HERO SLIDES - Add / Remove / Reindex
       ================================================================ */
    function slideImageField(p, id, key, label, desc, cls) {
        var html = '<tr class="' + (cls || 'sasanperfumes-slide-image-fields') + '"><th>' + label + '</th><td><div class="sasanperfumes-image-field">' +
            '<input type="hidden" name="' + p + '[' + key + ']" id="' + id + '_' + key + '" value="">' +
            '<button type="button" class="button sasanperfumes-upload-btn" data-target="#' + id + '_' + key + '" data-preview="#' + id + '_' + key + '_preview">Upload Image</button>' +
            '<button type="button" class="button sasanperfumes-remove-btn" data-target="#' + id + '_' + key + '" data-preview="#' + id + '_' + key + '_preview" style="display:none;">Remove</button>' +
            '<div id="' + id + '_' + key + '_preview" class="sasanperfumes-preview"></div>';
        if (desc) html += '<p class="description">' + desc + '</p>';
        html += '</div></td></tr>';
        return html;
    }

    function slideTemplate(i) {
        var p = 'sasanperfumes_hero_slides[' + i + ']', id = 'sasanperfumes_hero_slides_' + i;
        return '<div class="sasanperfumes-slide-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">' +
            '<h4>Slide ' + (i+1) + ' <button type="button" class="button sasanperfumes-remove-slide" style="float:right;color:red;">Remove</button></h4>' +
            '<table class="form-table">' +
            '<tr><th>Enable</th><td><label><input type="hidden" name="' + p + '[enabled]" value="0"><input type="checkbox" name="' + p + '[enabled]" value="1" checked> Show this slide</label></td></tr>' +
            '<tr><th>Slide Type</th><td><select name="' + p + '[slide_type]"><option value="image">Image</option><option value="video">Video</option></select><p class="description">Choose Image for a photo slide, Video for YouTube/Vimeo/mp4.</p></td></tr>' +
            slideImageField(p, id, 'image', 'Desktop Image (EN)', '') +
            slideImageField(p, id, 'mobile', 'Mobile Image (EN)', '') +
            slideImageField(p, id, 'image_ar', 'Desktop Image (AR)', 'Falls back to EN if empty.') +
            slideImageField(p, id, 'mobile_ar', 'Mobile Image (AR)', 'Falls back to EN mobile if empty.') +
            '<tr class="sasanperfumes-slide-video-fields"><th>Desktop Video URL (EN)</th><td><input type="text" name="' + p + '[video_url]" value="" class="large-text" placeholder="https://youtube.com/... or .mp4 URL"></td></tr>' +
            '<tr class="sasanperfumes-slide-video-fields"><th>Mobile Video URL (EN)</th><td><input type="text" name="' + p + '[video_mobile]" value="" class="large-text" placeholder="Mobile video URL (falls back to desktop)"></td></tr>' +
            '<tr class="sasanperfumes-slide-video-fields"><th>Desktop Video URL (AR)</th><td><input type="text" name="' + p + '[video_ar]" value="" class="large-text" placeholder="Arabic desktop video (falls back to EN)"></td></tr>' +
            '<tr class="sasanperfumes-slide-video-fields"><th>Mobile Video URL (AR)</th><td><input type="text" name="' + p + '[video_mobile_ar]" value="" class="large-text" placeholder="Arabic mobile video (falls back to EN mobile)"></td></tr>' +
            slideImageField(p, id, 'poster_url', 'Desktop Poster (EN)', '', 'sasanperfumes-slide-video-fields') +
            slideImageField(p, id, 'poster_mobile', 'Mobile Poster (EN)', '', 'sasanperfumes-slide-video-fields') +
            slideImageField(p, id, 'poster_ar', 'Desktop Poster (AR)', 'Falls back to EN poster if empty.', 'sasanperfumes-slide-video-fields') +
            slideImageField(p, id, 'poster_mobile_ar', 'Mobile Poster (AR)', 'Falls back to EN mobile poster if empty.', 'sasanperfumes-slide-video-fields') +
            '<tr><th>Title (EN)</th><td><input type="text" name="' + p + '[title_en]" value="" class="large-text"></td></tr>' +
            '<tr><th>Title (AR)</th><td><input type="text" name="' + p + '[title_ar]" value="" class="large-text" dir="rtl"></td></tr>' +
            '<tr><th>Subtitle (EN)</th><td><input type="text" name="' + p + '[subtitle_en]" value="" class="large-text"></td></tr>' +
            '<tr><th>Subtitle (AR)</th><td><input type="text" name="' + p + '[subtitle_ar]" value="" class="large-text" dir="rtl"></td></tr>' +
            '<tr><th>CTA Label (EN)</th><td><input type="text" name="' + p + '[cta_label_en]" value="" class="regular-text" placeholder="Shop Now"></td></tr>' +
            '<tr><th>CTA Label (AR)</th><td><input type="text" name="' + p + '[cta_label_ar]" value="" class="regular-text" dir="rtl" placeholder="تسوق الآن"></td></tr>' +
            '<tr><th>Link URL</th><td><input type="text" name="' + p + '[link]" value="" class="large-text" placeholder="/shop or https://example.com"></td></tr>' +
            '</table></div>';
    }

    $('#sasanperfumes-add-slide').on('click', function() {
        var c = $('#sasanperfumes-hero-slides'); c.append(slideTemplate(c.find('.sasanperfumes-slide-item').length));
    });
    $(document).on('click', '.sasanperfumes-remove-slide', function() {
        $(this).closest('.sasanperfumes-slide-item').remove();
        reindexRepeater($('#sasanperfumes-hero-slides'), 'sasanperfumes-slide-item', 'Slide');
    });

    /* ================================================================
       COLLECTIONS - Add / Remove / Reindex
       ================================================================ */
    function collectionTemplate(i) {
        var p = 'sasanperfumes_collections_items[' + i + ']', id = 'sasanperfumes_collections_items_' + i;
        return '<div class="sasanperfumes-collection-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">' +
            '<h4>Collection ' + (i+1) + ' <button type="button" class="button sasanperfumes-remove-collection" style="float:right;color:red;">Remove</button></h4>' +
            '<table class="form-table">' +
            '<tr><th>Image</th><td><div class="sasanperfumes-image-field">' +
            '<input type="hidden" name="' + p + '[image]" id="' + id + '_image" value="">' +
            '<button type="button" class="button sasanperfumes-upload-btn" data-target="#' + id + '_image" data-preview="#' + id + '_image_preview">Upload Image</button>' +
            '<button type="button" class="button sasanperfumes-remove-btn" data-target="#' + id + '_image" data-preview="#' + id + '_image_preview" style="display:none;">Remove</button>' +
            '<div id="' + id + '_image_preview" class="sasanperfumes-preview"></div></div></td></tr>' +
            '<tr><th>Title (EN)</th><td><input type="text" name="' + p + '[title]" value="" class="regular-text"></td></tr>' +
            '<tr><th>Title (AR)</th><td><input type="text" name="' + p + '[title_ar]" value="" class="regular-text" dir="rtl"></td></tr>' +
            '<tr><th>Description (EN)</th><td><textarea name="' + p + '[description]" class="large-text" rows="2"></textarea></td></tr>' +
            '<tr><th>Description (AR)</th><td><textarea name="' + p + '[description_ar]" class="large-text" rows="2" dir="rtl"></textarea></td></tr>' +
            '<tr><th>Link</th><td><input type="text" name="' + p + '[link]" value="" class="large-text" placeholder="/shop or https://example.com"></td></tr>' +
            '</table></div>';
    }

    $('#sasanperfumes-add-collection').on('click', function() {
        var c = $('#sasanperfumes-collections-items'); c.append(collectionTemplate(c.find('.sasanperfumes-collection-item').length));
    });
    $(document).on('click', '.sasanperfumes-remove-collection', function() {
        $(this).closest('.sasanperfumes-collection-item').remove();
        reindexRepeater($('#sasanperfumes-collections-items'), 'sasanperfumes-collection-item', 'Collection');
    });

    /* ================================================================
       HOME SECTIONS — Why Choose Us / Our Story / FAQ Repeaters
       ================================================================ */
    function wcusItemTemplate(i) {
        var p = 'sasanperfumes_home_wcus_items[' + i + ']';
        return '<div class="sasanperfumes-repeater-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">' +
            '<h4>Item ' + (i+1) + ' <button type="button" class="button sasanperfumes-remove-repeater-item" style="float:right;color:red;">Remove</button></h4>' +
            '<table class="form-table">' +
            '<tr><th>Title (EN)</th><td><input type="text" name="' + p + '[title_en]" value="" class="regular-text"></td></tr>' +
            '<tr><th>Title (AR)</th><td><input type="text" name="' + p + '[title_ar]" value="" class="regular-text" dir="rtl"></td></tr>' +
            '<tr><th>Desc (EN)</th><td><textarea name="' + p + '[desc_en]" rows="3" class="large-text"></textarea></td></tr>' +
            '<tr><th>Desc (AR)</th><td><textarea name="' + p + '[desc_ar]" rows="3" class="large-text" dir="rtl"></textarea></td></tr>' +
            '</table></div>';
    }

    function storyStatTemplate(i) {
        var p = 'sasanperfumes_home_story_stats[' + i + ']';
        return '<div class="sasanperfumes-repeater-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">' +
            '<h4>Stat ' + (i+1) + ' <button type="button" class="button sasanperfumes-remove-repeater-item" style="float:right;color:red;">Remove</button></h4>' +
            '<table class="form-table">' +
            '<tr><th>Value</th><td><input type="text" name="' + p + '[value]" value="" class="regular-text"></td></tr>' +
            '<tr><th>Label (EN)</th><td><input type="text" name="' + p + '[label_en]" value="" class="regular-text"></td></tr>' +
            '<tr><th>Label (AR)</th><td><input type="text" name="' + p + '[label_ar]" value="" class="regular-text" dir="rtl"></td></tr>' +
            '</table></div>';
    }

    function faqItemTemplate(i) {
        var p = 'sasanperfumes_home_faq_items[' + i + ']';
        return '<div class="sasanperfumes-repeater-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">' +
            '<h4>FAQ ' + (i+1) + ' <button type="button" class="button sasanperfumes-remove-repeater-item" style="float:right;color:red;">Remove</button></h4>' +
            '<table class="form-table">' +
            '<tr><th>Q (EN)</th><td><input type="text" name="' + p + '[q_en]" value="" class="large-text"></td></tr>' +
            '<tr><th>Q (AR)</th><td><input type="text" name="' + p + '[q_ar]" value="" class="large-text" dir="rtl"></td></tr>' +
            '<tr><th>A (EN)</th><td><textarea name="' + p + '[a_en]" rows="3" class="large-text"></textarea></td></tr>' +
            '<tr><th>A (AR)</th><td><textarea name="' + p + '[a_ar]" rows="3" class="large-text" dir="rtl"></textarea></td></tr>' +
            '</table></div>';
    }

    // Why Choose Us — add item via template (delegated)
    $(document).on('click', '#sasanperfumes-add-wcus-item', function() {
        var c = $('#sasanperfumes-wcus-items');
        c.append(wcusItemTemplate(c.find('.sasanperfumes-repeater-item').length));
    });

    // Our Story — add stat via template (delegated)
    $(document).on('click', '#sasanperfumes-add-story-stat', function() {
        var c = $('#sasanperfumes-story-stats');
        c.append(storyStatTemplate(c.find('.sasanperfumes-repeater-item').length));
    });

    // FAQ — add item via template (delegated)
    $(document).on('click', '#sasanperfumes-add-faq-item', function() {
        var c = $('#sasanperfumes-faq-items');
        c.append(faqItemTemplate(c.find('.sasanperfumes-repeater-item').length));
    });

    /* ================================================================
       GENERIC REPEATER - Used by Notes, Content Blocks, etc.
       ================================================================ */
    $(document).on('click', '.sasanperfumes-sp-add', function() {
        var container = $('#' + $(this).data('target'));
        var items = container.find('.sasanperfumes-repeater-item');
        if (!items.length) return;
        var clone = items.last().clone();
        var count = items.length;
        clone.find('input, textarea').each(function() {
            var n = $(this).attr('name');
            if (n) $(this).attr('name', n.replace(/\[\d+\]/, '[' + count + ']'));
            $(this).val('');
        });
        clone.find('.sasanperfumes-product-preview').empty();
        clone.find('h4').contents().first().replaceWith(
            clone.find('h4').contents().first().text().replace(/\d+/, count + 1)
        );
        container.append(clone);
    });

    $(document).on('click', '.sasanperfumes-remove-repeater-item', function() {
        var item = $(this).closest('.sasanperfumes-repeater-item');
        var container = item.parent();
        item.remove();
        // Reindex remaining items
        container.find('.sasanperfumes-repeater-item').each(function(i) {
            $(this).find('h4').contents().first().replaceWith(
                $(this).find('h4').contents().first().text().replace(/\d+/, i + 1) + ' '
            );
            $(this).find('input, textarea').each(function() {
                var n = $(this).attr('name');
                if (n) $(this).attr('name', n.replace(/\[\d+\]/, '[' + i + ']'));
            });
        });
    });

    /* ================================================================
       BANNERS - Add / Remove / Reindex
       ================================================================ */
    function bannerTemplate(i) {
        var p = 'sasanperfumes_banners_items[' + i + ']', id = 'sasanperfumes_banners_items_' + i;
        return '<div class="sasanperfumes-banner-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">' +
            '<h4>Banner ' + (i+1) + ' <button type="button" class="button sasanperfumes-remove-banner" style="float:right;color:red;">Remove</button></h4>' +
            '<table class="form-table">' +
            '<tr><th>Desktop Image (EN)</th><td><div class="sasanperfumes-image-field">' +
            '<input type="hidden" name="' + p + '[image]" id="' + id + '_image" value="">' +
            '<button type="button" class="button sasanperfumes-upload-btn" data-target="#' + id + '_image" data-preview="#' + id + '_image_preview">Upload Image</button>' +
            '<button type="button" class="button sasanperfumes-remove-btn" data-target="#' + id + '_image" data-preview="#' + id + '_image_preview" style="display:none;">Remove</button>' +
            '<div id="' + id + '_image_preview" class="sasanperfumes-preview"></div></div></td></tr>' +
            '<tr><th>Mobile Image (EN)</th><td><div class="sasanperfumes-image-field">' +
            '<input type="hidden" name="' + p + '[mobile]" id="' + id + '_mobile" value="">' +
            '<button type="button" class="button sasanperfumes-upload-btn" data-target="#' + id + '_mobile" data-preview="#' + id + '_mobile_preview">Upload Image</button>' +
            '<button type="button" class="button sasanperfumes-remove-btn" data-target="#' + id + '_mobile" data-preview="#' + id + '_mobile_preview" style="display:none;">Remove</button>' +
            '<div id="' + id + '_mobile_preview" class="sasanperfumes-preview"></div></div></td></tr>' +
            '<tr><th>Desktop Image (AR)</th><td><div class="sasanperfumes-image-field">' +
            '<input type="hidden" name="' + p + '[image_ar]" id="' + id + '_image_ar" value="">' +
            '<button type="button" class="button sasanperfumes-upload-btn" data-target="#' + id + '_image_ar" data-preview="#' + id + '_image_ar_preview">Upload Image</button>' +
            '<button type="button" class="button sasanperfumes-remove-btn" data-target="#' + id + '_image_ar" data-preview="#' + id + '_image_ar_preview" style="display:none;">Remove</button>' +
            '<div id="' + id + '_image_ar_preview" class="sasanperfumes-preview"></div></div>' +
            '<p class="description">Arabic version. Falls back to EN image if empty.</p></td></tr>' +
            '<tr><th>Mobile Image (AR)</th><td><div class="sasanperfumes-image-field">' +
            '<input type="hidden" name="' + p + '[mobile_ar]" id="' + id + '_mobile_ar" value="">' +
            '<button type="button" class="button sasanperfumes-upload-btn" data-target="#' + id + '_mobile_ar" data-preview="#' + id + '_mobile_ar_preview">Upload Image</button>' +
            '<button type="button" class="button sasanperfumes-remove-btn" data-target="#' + id + '_mobile_ar" data-preview="#' + id + '_mobile_ar_preview" style="display:none;">Remove</button>' +
            '<div id="' + id + '_mobile_ar_preview" class="sasanperfumes-preview"></div></div>' +
            '<p class="description">Arabic version. Falls back to EN mobile image if empty.</p></td></tr>' +
            '<tr><th>Title (EN)</th><td><input type="text" name="' + p + '[title]" value="" class="regular-text"></td></tr>' +
            '<tr><th>Title (AR)</th><td><input type="text" name="' + p + '[title_ar]" value="" class="regular-text" dir="rtl"></td></tr>' +
            '<tr><th>Subtitle (EN)</th><td><input type="text" name="' + p + '[subtitle]" value="" class="regular-text"></td></tr>' +
            '<tr><th>Subtitle (AR)</th><td><input type="text" name="' + p + '[subtitle_ar]" value="" class="regular-text" dir="rtl"></td></tr>' +
            '<tr><th>Link</th><td><input type="text" name="' + p + '[link]" value="" class="large-text" placeholder="/shop or https://example.com"></td></tr>' +
            '</table></div>';
    }

    $('#sasanperfumes-add-banner').on('click', function() {
        var c = $('#sasanperfumes-banners-items'); c.append(bannerTemplate(c.find('.sasanperfumes-banner-item').length));
    });
    $(document).on('click', '.sasanperfumes-remove-banner', function() {
        $(this).closest('.sasanperfumes-banner-item').remove();
        reindexRepeater($('#sasanperfumes-banners-items'), 'sasanperfumes-banner-item', 'Banner');
    });

    /* ================================================================
       ADS - Add / Remove / Reindex
       ================================================================ */
    function adImageField(p, id, key, label, desc) {
        var html = '<tr class="sasanperfumes-ad-image-fields"><th>' + label + '</th><td><div class="sasanperfumes-image-field">' +
            '<input type="hidden" name="' + p + '[' + key + ']" id="' + id + '_' + key + '" value="">' +
            '<button type="button" class="button sasanperfumes-upload-btn" data-target="#' + id + '_' + key + '" data-preview="#' + id + '_' + key + '_preview">Upload Image</button>' +
            '<button type="button" class="button sasanperfumes-remove-btn" data-target="#' + id + '_' + key + '" data-preview="#' + id + '_' + key + '_preview" style="display:none;">Remove</button>' +
            '<div id="' + id + '_' + key + '_preview" class="sasanperfumes-preview"></div>';
        if (desc) html += '<p class="description">' + desc + '</p>';
        html += '</div></td></tr>';
        return html;
    }

    function adTemplate(i) {
        var p = 'sasanperfumes_ads_items[' + i + ']', id = 'sasanperfumes_ads_items_' + i;
        return '<div class="sasanperfumes-ad-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">' +
            '<h4>Ad ' + (i+1) + ' <button type="button" class="button sasanperfumes-remove-ad" style="float:right;color:red;">Remove</button></h4>' +
            '<table class="form-table">' +
            '<tr><th>Enable</th><td><label><input type="hidden" name="' + p + '[enabled]" value="0"><input type="checkbox" name="' + p + '[enabled]" value="1" checked> Show this ad</label></td></tr>' +
            '<tr><th>Placement</th><td><select name="' + p + '[placement]"><option value="home" selected>Home page</option><option value="shop">Shop page</option><option value="category">Category pages</option><option value="product">Product pages</option><option value="all">All pages</option></select></td></tr>' +
            '<tr><th>Market</th><td><select name="' + p + '[market]"><option value="all" selected>All markets</option><option value="intl">International / UAE</option><option value="qa">Qatar</option><option value="om">Oman</option><option value="sa">Saudi Arabia</option></select></td></tr>' +
            adImageField(p, id, 'image', 'Desktop Image (EN)', '') +
            adImageField(p, id, 'mobile', 'Mobile Image (EN)', '') +
            adImageField(p, id, 'image_ar', 'Desktop Image (AR)', 'Falls back to the English image if empty.') +
            adImageField(p, id, 'mobile_ar', 'Mobile Image (AR)', 'Falls back to the English mobile image if empty.') +
            '<tr><th>Title (EN)</th><td><input type="text" name="' + p + '[title]" value="" class="regular-text"></td></tr>' +
            '<tr><th>Title (AR)</th><td><input type="text" name="' + p + '[title_ar]" value="" class="regular-text" dir="rtl"></td></tr>' +
            '<tr><th>Subtitle (EN)</th><td><input type="text" name="' + p + '[subtitle]" value="" class="regular-text"></td></tr>' +
            '<tr><th>Subtitle (AR)</th><td><input type="text" name="' + p + '[subtitle_ar]" value="" class="regular-text" dir="rtl"></td></tr>' +
            '<tr><th>Button Text (EN)</th><td><input type="text" name="' + p + '[button_text]" value="" class="regular-text" placeholder="Shop Now"></td></tr>' +
            '<tr><th>Button Text (AR)</th><td><input type="text" name="' + p + '[button_text_ar]" value="" class="regular-text" dir="rtl" placeholder="تسوق الآن"></td></tr>' +
            '<tr><th>Link</th><td><input type="text" name="' + p + '[link]" value="" class="large-text" placeholder="/shop or https://example.com"></td></tr>' +
            '</table></div>';
    }

    $('#sasanperfumes-add-ad').on('click', function() {
        var c = $('#sasanperfumes-ads-items'); c.append(adTemplate(c.find('.sasanperfumes-ad-item').length));
    });
    $(document).on('click', '.sasanperfumes-remove-ad', function() {
        $(this).closest('.sasanperfumes-ad-item').remove();
        reindexRepeater($('#sasanperfumes-ads-items'), 'sasanperfumes-ad-item', 'Ad');
    });

    /* ================================================================
       CATEGORY SELECTOR - Check/uncheck + drag-and-drop reorder
       ================================================================ */

    function updateCatEmptyMsg() {
        var count = $('#sasanperfumes-cat-selected-list .sasanperfumes-cat-selected-item').length;
        $('#sasanperfumes-cat-empty-msg').toggle(count === 0);
    }

    /** Build a selected-category card from data attributes */
    function buildSelectedCatItem(id, name, slug, count, thumb) {
        var html = '<div class="sasanperfumes-cat-item sasanperfumes-cat-selected-item" data-id="' + id + '" style="display:flex;align-items:center;padding:10px;margin-bottom:6px;background:#fff;border:1px solid #c5d9ed;border-radius:4px;cursor:grab;">';
        html += '<span class="dashicons dashicons-menu" style="margin-right:10px;color:#999;cursor:grab;"></span>';
        if (thumb) html += '<img src="' + thumb + '" style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:10px;">';
        html += '<div style="flex:1;"><strong>' + name + '</strong>';
        html += '<small style="color:#666;"> (' + count + ' products) &middot; slug: ' + slug + '</small></div>';
        html += '<input type="hidden" name="sasanperfumes_categories_selected[]" value="' + id + '">';
        html += '<button type="button" class="button sasanperfumes-cat-deselect" style="color:red;" title="Remove">&times;</button>';
        html += '</div>';
        return html;
    }

    // Checkbox toggle: add/remove from selected list
    $(document).on('change', '.sasanperfumes-cat-checkbox', function() {
        var cb = $(this), id = cb.val();
        var availItem = cb.closest('.sasanperfumes-cat-available-item');
        if (cb.is(':checked')) {
            // Add to selected list
            var name = availItem.data('name'), slug = availItem.data('slug');
            var count = availItem.data('count'), thumb = availItem.data('thumb');
            $('#sasanperfumes-cat-selected-list').append(buildSelectedCatItem(id, name, slug, count, thumb));
            availItem.css('opacity', '0.4');
        } else {
            // Remove from selected list
            $('#sasanperfumes-cat-selected-list .sasanperfumes-cat-selected-item[data-id="' + id + '"]').remove();
            availItem.css('opacity', '1');
        }
        updateCatEmptyMsg();
    });

    // Deselect button in selected list
    $(document).on('click', '.sasanperfumes-cat-deselect', function(e) {
        e.preventDefault();
        var item = $(this).closest('.sasanperfumes-cat-selected-item');
        var id = item.data('id');
        // Uncheck the checkbox in available list
        $('.sasanperfumes-cat-available-item[data-id="' + id + '"]').css('opacity', '1')
            .find('.sasanperfumes-cat-checkbox').prop('checked', false);
        item.remove();
        updateCatEmptyMsg();
    });

    // jQuery UI Sortable for drag-and-drop reordering
    if ($('#sasanperfumes-cat-selected-list').length && $.fn.sortable) {
        $('#sasanperfumes-cat-selected-list').sortable({
            items: '.sasanperfumes-cat-selected-item',
            handle: '.dashicons-menu',
            placeholder: 'sasanperfumes-cat-sortable-placeholder',
            tolerance: 'pointer',
            cursor: 'grabbing'
        });
    }

    /* ================================================================
       PRODUCT SELECTOR (for Featured / Bestsellers / New Products)
       Search, select, deselect, drag-and-drop reorder
       ================================================================ */

    var prodSearchTimer = null;

    function updateProdEmptyMsg(section) {
        var list = section.find('.sasanperfumes-prod-selected-list');
        var count = list.find('.sasanperfumes-prod-selected-item').length;
        list.find('.sasanperfumes-prod-empty-msg').toggle(count === 0);
    }

    /** Build a selected-product card */
    function buildProdSelectedItem(sectionKey, p) {
        var safe = $('<span>').text(p.name).html();
        var cat = p.category || '';
        var html = '<div class="sasanperfumes-prod-selected-item" data-slug="' + p.slug + '" style="display:flex;align-items:center;padding:10px;margin-bottom:6px;background:#fff;border:1px solid #c5d9ed;border-radius:4px;cursor:grab;">';
        html += '<span class="dashicons dashicons-menu" style="margin-right:10px;color:#999;cursor:grab;"></span>';
        if (p.image) html += '<img src="' + p.image + '" style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:10px;">';
        html += '<div style="flex:1;"><strong>' + safe + '</strong>';
        if (cat) html += '<br><small style="color:#0073aa;">Category: ' + cat + '</small>';
        html += '<br><small style="color:#666;">Slug: ' + p.slug + ' &middot; ' + p.price;
        if (p.sku) html += ' &middot; SKU: ' + p.sku;
        html += '</small></div>';
        html += '<input type="hidden" name="sasanperfumes_' + sectionKey + '_selected_products[]" value="' + p.slug + '">';
        html += '<button type="button" class="button sasanperfumes-prod-deselect" style="color:red;" title="Remove">&times;</button>';
        html += '</div>';
        return html;
    }

    // Search input for product selector
    $(document).on('input', '.sasanperfumes-prod-search', function() {
        var input = $(this), section = input.closest('.sasanperfumes-product-selector-section');
        var results = section.find('.sasanperfumes-prod-results'), q = input.val().trim();
        clearTimeout(prodSearchTimer);
        if (q.length < 2) { results.hide().empty(); return; }
        prodSearchTimer = setTimeout(function() {
            $.get(sasanperfumesAdmin.ajaxurl, { action: 'sasanperfumes_search_products', nonce: sasanperfumesAdmin.nonce, q: q }, function(res) {
                if (!res.success || !res.data.length) {
                    results.html('<div style="padding:8px;color:#999;">No products found</div>').show();
                    return;
                }
                // Filter out already-selected slugs
                var selectedSlugs = [];
                section.find('.sasanperfumes-prod-selected-item').each(function() {
                    selectedSlugs.push($(this).data('slug'));
                });
                var filtered = $.grep(res.data, function(p) {
                    return $.inArray(p.slug, selectedSlugs) === -1;
                });
                if (!filtered.length) {
                    results.html('<div style="padding:8px;color:#999;">All matching products already selected</div>').show();
                    return;
                }
                results.html($.map(filtered, function(p) {
                    return productRow(p);
                }).join('')).show();
            });
        }, 300);
    });

    // Select product from search results
    $(document).on('click', '.sasanperfumes-product-selector-section .sasanperfumes-product-result', function() {
        var el = $(this), section = el.closest('.sasanperfumes-product-selector-section');
        var sectionKey = section.data('section');
        var p = {
            slug: el.data('slug'), name: el.data('name'), price: el.data('price'),
            sku: el.data('sku'), image: el.data('image'), category: el.data('category')
        };
        section.find('.sasanperfumes-prod-selected-list').append(buildProdSelectedItem(sectionKey, p));
        section.find('.sasanperfumes-prod-search').val('');
        section.find('.sasanperfumes-prod-results').hide().empty();
        updateProdEmptyMsg(section);
    });

    // Deselect product
    $(document).on('click', '.sasanperfumes-prod-deselect', function(e) {
        e.preventDefault();
        var item = $(this).closest('.sasanperfumes-prod-selected-item');
        var section = item.closest('.sasanperfumes-product-selector-section');
        item.remove();
        updateProdEmptyMsg(section);
    });

    // Hide product search results on outside click
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.sasanperfumes-product-selector-section').length) {
            $('.sasanperfumes-prod-results').hide();
        }
    });

    // jQuery UI Sortable for product selector drag-and-drop
    $('.sasanperfumes-prod-selected-list').each(function() {
        if ($.fn.sortable) {
            $(this).sortable({
                items: '.sasanperfumes-prod-selected-item',
                handle: '.dashicons-menu',
                placeholder: 'sasanperfumes-prod-sortable-placeholder',
                tolerance: 'pointer',
                cursor: 'grabbing'
            });
        }
    });

    /* ================================================================
       FOOTER LINKS - Add / Remove / Reindex
       ================================================================ */
    function footerLinkTemplate(container, i) {
        var prefix = container.attr('id') === 'sasanperfumes-footer-quick-links' ? 'sasanperfumes_footer_quick_links' : 'sasanperfumes_footer_cs_links';
        return '<div class="sasanperfumes-footer-link-item" style="background:#f9f9f9;padding:15px;margin-bottom:10px;border:1px solid #ddd;">' +
            '<h4>Link ' + (i+1) + ' <button type="button" class="button sasanperfumes-remove-footer-link" style="float:right;color:red;">Remove</button></h4>' +
            '<table class="form-table">' +
            '<tr><th>Label (EN)</th><td><input type="text" name="' + prefix + '[' + i + '][label_en]" value="" class="regular-text"></td></tr>' +
            '<tr><th>Label (AR)</th><td><input type="text" name="' + prefix + '[' + i + '][label_ar]" value="" class="regular-text" dir="rtl"></td></tr>' +
            '<tr><th>URL</th><td><input type="text" name="' + prefix + '[' + i + '][url]" value="" class="large-text" placeholder="/shop or https://example.com"></td></tr>' +
            '</table></div>';
    }

    function reindexFooterLinks(container) {
        var prefix = container.attr('id') === 'sasanperfumes-footer-quick-links' ? 'sasanperfumes_footer_quick_links' : 'sasanperfumes_footer_cs_links';
        container.find('.sasanperfumes-footer-link-item').each(function(i) {
            $(this).find('h4').contents().first().replaceWith('Link ' + (i + 1) + ' ');
            $(this).find('input').each(function() {
                var n = $(this).attr('name');
                if (n) $(this).attr('name', n.replace(/\[\d+\]/, '[' + i + ']'));
            });
        });
    }

    $('#sasanperfumes-add-quick-link').on('click', function() {
        var c = $('#sasanperfumes-footer-quick-links');
        c.append(footerLinkTemplate(c, c.find('.sasanperfumes-footer-link-item').length));
    });

    $('#sasanperfumes-add-cs-link').on('click', function() {
        var c = $('#sasanperfumes-footer-cs-links');
        c.append(footerLinkTemplate(c, c.find('.sasanperfumes-footer-link-item').length));
    });

    $(document).on('click', '.sasanperfumes-remove-footer-link', function() {
        var item = $(this).closest('.sasanperfumes-footer-link-item');
        var container = item.parent();
        item.remove();
        reindexFooterLinks(container);
    });

    /* ================================================================
       PRODUCT PAGE CPT — Banners / Features / FAQs Repeaters
       ================================================================ */

    /** Safe ID: mirrors PHP str_replace(array('[',']'), array('_',''), $name) */
    function safeId(name) { return name.replace(/\[/g, '_').replace(/\]/g, ''); }

    /** Image field HTML for dynamic templates (mirrors sasanperfumes_pp_image_field PHP) */
    function ppImageField(name) {
        var sid = safeId(name);
        return '<div class="sasanperfumes-image-field">' +
            '<input type="hidden" name="' + name + '" id="' + sid + '" value="">' +
            '<button type="button" class="button sasanperfumes-upload-btn" data-target="#' + sid + '" data-preview="#' + sid + '_preview">Upload Image</button>' +
            '<button type="button" class="button sasanperfumes-remove-btn" data-target="#' + sid + '" data-preview="#' + sid + '_preview" style="display:none;">Remove</button>' +
            '<div id="' + sid + '_preview" class="sasanperfumes-preview"></div></div>';
    }

    // — Banner template
    function ppBannerTemplate(i) {
        var p = 'sasanperfumes_pp_banners[' + i + ']';
        return '<div class="sasanperfumes-banner-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">' +
            '<h4>Banner ' + (i+1) + ' <button type="button" class="button sasanperfumes-pp-remove-banner" style="float:right;color:red;">Remove</button></h4>' +
            '<table class="form-table">' +
            '<tr><th>Desktop Image</th><td>' + ppImageField(p + '[image]') + '</td></tr>' +
            '<tr><th>Mobile Image</th><td>' + ppImageField(p + '[mobile]') + '</td></tr>' +
            '<tr><th>Title (EN)</th><td><input type="text" name="' + p + '[title]" value="" class="regular-text"></td></tr>' +
            '<tr><th>Title (AR)</th><td><input type="text" name="' + p + '[title_ar]" value="" class="regular-text" dir="rtl"></td></tr>' +
            '<tr><th>Subtitle (EN)</th><td><input type="text" name="' + p + '[subtitle]" value="" class="regular-text"></td></tr>' +
            '<tr><th>Subtitle (AR)</th><td><input type="text" name="' + p + '[subtitle_ar]" value="" class="regular-text" dir="rtl"></td></tr>' +
            '<tr><th>Link</th><td><input type="text" name="' + p + '[link]" value="" class="large-text" placeholder="/shop or https://..."></td></tr>' +
            '</table></div>';
    }

    $(document).on('click', '#sasanperfumes-pp-add-banner', function() {
        var c = $('#sasanperfumes-pp-banners'); c.append(ppBannerTemplate(c.find('.sasanperfumes-banner-item').length));
    });
    $(document).on('click', '.sasanperfumes-pp-remove-banner', function() {
        var item = $(this).closest('.sasanperfumes-banner-item'), c = item.parent();
        item.remove();
        reindexRepeater(c, 'sasanperfumes-banner-item', 'Banner');
    });

    // — Feature template (with image upload)
    var ppIconOptions = ['sparkles','leaf','shield','star','heart','gift','truck','clock','check','award','droplet','sun','moon','flame','gem'];
    function ppFeatureTemplate(i) {
        var p = 'sasanperfumes_pp_features[' + i + ']';
        var opts = '';
        for (var k = 0; k < ppIconOptions.length; k++) {
            opts += '<option value="' + ppIconOptions[k] + '">' + ppIconOptions[k].charAt(0).toUpperCase() + ppIconOptions[k].slice(1) + '</option>';
        }
        return '<div class="sasanperfumes-feature-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">' +
            '<h4>Feature ' + (i+1) + ' <button type="button" class="button sasanperfumes-pp-remove-feature" style="float:right;color:red;">Remove</button></h4>' +
            '<table class="form-table">' +
            '<tr><th>Icon</th><td><select name="' + p + '[icon]">' + opts + '</select></td></tr>' +
            '<tr><th>Image</th><td>' + ppImageField(p + '[image]') + '<p class="description">Optional image. If set, overrides icon on frontend.</p></td></tr>' +
            '<tr><th>Title (EN)</th><td><input type="text" name="' + p + '[title]" value="" class="regular-text"></td></tr>' +
            '<tr><th>Title (AR)</th><td><input type="text" name="' + p + '[title_ar]" value="" class="regular-text" dir="rtl"></td></tr>' +
            '<tr><th>Description (EN)</th><td><textarea name="' + p + '[description]" class="large-text" rows="2"></textarea></td></tr>' +
            '<tr><th>Description (AR)</th><td><textarea name="' + p + '[description_ar]" class="large-text" rows="2" dir="rtl"></textarea></td></tr>' +
            '</table></div>';
    }

    $(document).on('click', '#sasanperfumes-pp-add-feature', function() {
        var c = $('#sasanperfumes-pp-features'); c.append(ppFeatureTemplate(c.find('.sasanperfumes-feature-item').length));
    });
    $(document).on('click', '.sasanperfumes-pp-remove-feature', function() {
        var item = $(this).closest('.sasanperfumes-feature-item'), c = item.parent();
        item.remove();
        reindexRepeater(c, 'sasanperfumes-feature-item', 'Feature');
    });

    // — FAQ template
    function ppFaqTemplate(i) {
        var p = 'sasanperfumes_pp_faqs[' + i + ']';
        return '<div class="sasanperfumes-faq-item" style="background:#f9f9f9;padding:15px;margin-bottom:15px;border:1px solid #ddd;">' +
            '<h4>FAQ ' + (i+1) + ' <button type="button" class="button sasanperfumes-pp-remove-faq" style="float:right;color:red;">Remove</button></h4>' +
            '<table class="form-table">' +
            '<tr><th>Question (EN)</th><td><input type="text" name="' + p + '[question]" value="" class="large-text"></td></tr>' +
            '<tr><th>Question (AR)</th><td><input type="text" name="' + p + '[question_ar]" value="" class="large-text" dir="rtl"></td></tr>' +
            '<tr><th>Answer (EN)</th><td><textarea name="' + p + '[answer]" class="large-text" rows="3"></textarea></td></tr>' +
            '<tr><th>Answer (AR)</th><td><textarea name="' + p + '[answer_ar]" class="large-text" rows="3" dir="rtl"></textarea></td></tr>' +
            '</table></div>';
    }

    $(document).on('click', '#sasanperfumes-pp-add-faq', function() {
        var c = $('#sasanperfumes-pp-faqs'); c.append(ppFaqTemplate(c.find('.sasanperfumes-faq-item').length));
    });
    $(document).on('click', '.sasanperfumes-pp-remove-faq', function() {
        var item = $(this).closest('.sasanperfumes-faq-item'), c = item.parent();
        item.remove();
        reindexRepeater(c, 'sasanperfumes-faq-item', 'FAQ');
    });

    // Page load: fetch product details for pre-filled slugs
    $('.sasanperfumes-product-selector-section').each(function() {
        var section = $(this), sectionKey = section.data('section');
        section.find('.sasanperfumes-prod-selected-item').each(function() {
            var item = $(this), slug = item.data('slug');
            if (!slug) return;
            $.get(sasanperfumesAdmin.ajaxurl, { action: 'sasanperfumes_search_products', nonce: sasanperfumesAdmin.nonce, q: slug }, function(res) {
                if (!res.success) return;
                var match = null;
                $.each(res.data, function(i, p) { if (p.slug === slug) { match = p; return false; } });
                if (match) {
                    var safe = $('<span>').text(match.name).html();
                    var info = '<strong>' + safe + '</strong>';
                    if (match.category) info += '<br><small style="color:#0073aa;">Category: ' + match.category + '</small>';
                    info += '<br><small style="color:#666;">Slug: ' + match.slug + ' &middot; ' + match.price;
                    if (match.sku) info += ' &middot; SKU: ' + match.sku;
                    info += '</small>';
                    item.find('.sasanperfumes-prod-item-info').html(info);
                    if (match.image && !item.find('img').length) {
                        item.find('.dashicons-menu').after('<img src="' + match.image + '" style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:10px;">');
                    }
                }
            });
        });
    });

    // Signal that this script executed successfully.
    // The PHP fallback checks this flag to avoid double-executing.
    window.__sasanperfumesAdminLoaded = true;
});
