<?php
/**
 * ShapeHive Size Guide Manager
 *
 * Provides a proper manual size guide system for fashion/clothing products.
 * Replaces the raw JSON textarea approach with a structured builder.
 *
 * Architecture:
 *  - CPT `sasanperfumes_size_guide` — one post per template (Shirt, Pant, Shorts, Jacket, etc.)
 *  - Template data stored in post meta (chart columns/rows, measurement sections)
 *  - Category assignment stored in template meta
 *  - Product-level override stored in product post meta `_sasanperfumes_size_guide_id`
 *
 * REST API:
 *  GET /wp-json/sasanperfumes/v1/size-guide?product_id=123
 *
 * @package sasanperfumes_Frontend_Settings
 * @since 6.7.0
 */

if (!defined('ABSPATH')) exit;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

add_action('init',            'sasanperfumes_sg_register_cpt');
add_action('add_meta_boxes',  'sasanperfumes_sg_add_meta_boxes');
add_action('save_post_sasanperfumes_size_guide', 'sasanperfumes_sg_save_meta', 10, 2);
add_action('add_meta_boxes',  'sasanperfumes_sg_add_product_metabox');
add_action('save_post_product','sasanperfumes_sg_save_product_meta', 10, 2);
add_action('rest_api_init',   'sasanperfumes_sg_register_routes');
add_action('admin_menu',      'sasanperfumes_sg_register_menu', 100);

// ---------------------------------------------------------------------------
// CPT Registration
// ---------------------------------------------------------------------------

function sasanperfumes_sg_register_cpt() {
    register_post_type('sasanperfumes_size_guide', [
        'labels' => [
            'name'               => 'Size Guide Templates',
            'singular_name'      => 'Size Guide Template',
            'add_new'            => 'Add New Template',
            'add_new_item'       => 'Add New Size Guide Template',
            'edit_item'          => 'Edit Size Guide Template',
            'all_items'          => 'All Templates',
            'menu_name'          => 'Size Guides',
        ],
        'public'          => false,
        'show_ui'         => true,
        'show_in_menu'    => false, // shown under sasanperfumes submenu
        'supports'        => ['title'],
        'has_archive'     => false,
        'rewrite'         => false,
        'capability_type' => 'post',
        'menu_icon'       => 'dashicons-editor-table',
    ]);
}

function sasanperfumes_sg_register_menu() {
    add_submenu_page(
        'sasanperfumes-settings',
        'Size Guide Templates',
        'Size Guides',
        'manage_options',
        'edit.php?post_type=sasanperfumes_size_guide'
    );
}

// ---------------------------------------------------------------------------
// Meta Boxes — Template Editor
// ---------------------------------------------------------------------------

function sasanperfumes_sg_add_meta_boxes() {
    add_meta_box('sasanperfumes_sg_basic',        'Basic Info & Display',  'sasanperfumes_sg_mb_basic',        'sasanperfumes_size_guide', 'normal', 'high');
    add_meta_box('sasanperfumes_sg_product_chart','Product Chart',         'sasanperfumes_sg_mb_product_chart','sasanperfumes_size_guide', 'normal', 'high');
    add_meta_box('sasanperfumes_sg_body_chart',   'Body Chart (Optional)', 'sasanperfumes_sg_mb_body_chart',   'sasanperfumes_size_guide', 'normal', 'default');
    add_meta_box('sasanperfumes_sg_measure',      'How to Measure',        'sasanperfumes_sg_mb_measure',      'sasanperfumes_size_guide', 'normal', 'default');
    add_meta_box('sasanperfumes_sg_assignment',   'Category Assignment',   'sasanperfumes_sg_mb_assignment',   'sasanperfumes_size_guide', 'side',   'default');
}

// ---- Basic Info metabox ----
function sasanperfumes_sg_mb_basic($post) {
    wp_nonce_field('sasanperfumes_sg_save', 'sasanperfumes_sg_nonce');
    $g = fn($k, $d = '') => get_post_meta($post->ID, $k, true) ?: $d;
    ?>
    <table class="form-table">
        <tr>
            <th>Title (EN)</th>
            <td><input type="text" name="sg_title_en" value="<?= esc_attr($g('_sg_title_en', get_the_title($post))) ?>" class="large-text" placeholder="e.g. Shirt Size Guide"></td>
        </tr>
        <tr>
            <th>Title (AR)</th>
            <td><input type="text" name="sg_title_ar" value="<?= esc_attr($g('_sg_title_ar')) ?>" class="large-text" dir="rtl" placeholder="دليل مقاسات القمصان"></td>
        </tr>
        <tr>
            <th>Default Unit</th>
            <td>
                <select name="sg_default_unit">
                    <option value="cm" <?= selected($g('_sg_default_unit', 'cm'), 'cm', false) ?>>CM</option>
                    <option value="in" <?= selected($g('_sg_default_unit', 'cm'), 'in', false) ?>>IN</option>
                </select>
            </td>
        </tr>
        <tr>
            <th>Fit Type</th>
            <td>
                <select name="sg_fit_type">
                    <?php foreach (['slim' => 'Slim / Skinny', 'regular' => 'Regular', 'oversized' => 'Oversized'] as $v => $l): ?>
                        <option value="<?= $v ?>" <?= selected($g('_sg_fit_type', 'regular'), $v, false) ?>><?= $l ?></option>
                    <?php endforeach; ?>
                </select>
                <p class="description">Shown as a scale indicator in the modal: Slim — Regular — Oversized</p>
            </td>
        </tr>
        <tr>
            <th>Measurement Note (EN)</th>
            <td>
                <input type="text" name="sg_note_en" value="<?= esc_attr($g('_sg_note_en', 'This data was obtained from manually measuring the product, it may be off by 1–2 CM.')) ?>" class="large-text">
                <p class="description">Shown below the size table in the modal.</p>
            </td>
        </tr>
        <tr>
            <th>Measurement Note (AR)</th>
            <td><input type="text" name="sg_note_ar" value="<?= esc_attr($g('_sg_note_ar', 'تم الحصول على هذه البيانات من قياس المنتج يدوياً، وقد يكون هناك فارق يصل إلى 1–2 سم.')) ?>" class="large-text" dir="rtl"></td>
        </tr>
        <tr>
            <th>Enable Body Chart</th>
            <td><input type="checkbox" name="sg_enable_body_chart" value="1" <?= checked($g('_sg_enable_body_chart', 0), 1, false) ?>><span class="description"> Show a second "Body Measurements" tab alongside the product chart.</span></td>
        </tr>
    </table>
    <?php
}

// ---- Shared chart builder UI ----
function sasanperfumes_sg_render_chart_builder($post, $meta_key_columns, $meta_key_rows, $chart_label, $id_prefix) {
    $cols_raw = get_post_meta($post->ID, $meta_key_columns, true);
    $rows_raw = get_post_meta($post->ID, $meta_key_rows, true);
    $columns = is_array($cols_raw) ? $cols_raw : [];
    $rows    = is_array($rows_raw) ? $rows_raw : [];
    $cols_json = json_encode($columns, JSON_UNESCAPED_UNICODE);
    $rows_json = json_encode($rows, JSON_UNESCAPED_UNICODE);
    ?>
    <p class="description">Define columns first, then add measurement rows. Measurements can be entered in CM; IN values are auto-calculated (÷2.54) if left blank.</p>

    <!-- Load sample data buttons -->
    <div style="margin:12px 0 6px;display:flex;gap:8px;flex-wrap:wrap;">
        <strong style="line-height:28px">Load sample:</strong>
        <button type="button" class="button button-small sasanperfumes-sg-load-sample" data-prefix="<?= esc_attr($id_prefix) ?>" data-type="shirt">Shirt / Polo</button>
        <button type="button" class="button button-small sasanperfumes-sg-load-sample" data-prefix="<?= esc_attr($id_prefix) ?>" data-type="pant">Pants / Trousers</button>
        <button type="button" class="button button-small sasanperfumes-sg-load-sample" data-prefix="<?= esc_attr($id_prefix) ?>" data-type="short">Shorts</button>
        <button type="button" class="button button-small sasanperfumes-sg-load-sample" data-prefix="<?= esc_attr($id_prefix) ?>" data-type="jacket">Jacket / Hoodie</button>
    </div>

    <h4 style="margin:12px 0 6px">Columns</h4>
    <div id="<?= esc_attr($id_prefix) ?>-cols" style="margin-bottom:10px;">
        <table class="wp-list-table widefat fixed striped" style="table-layout:auto">
            <thead><tr>
                <th style="width:30px">#</th>
                <th>Key (no spaces)</th>
                <th>Label EN</th>
                <th>Label AR</th>
                <th>Type</th>
                <th style="width:60px">Remove</th>
            </tr></thead>
            <tbody id="<?= esc_attr($id_prefix) ?>-cols-body"></tbody>
        </table>
        <button type="button" class="button sasanperfumes-sg-add-col" data-prefix="<?= esc_attr($id_prefix) ?>" style="margin-top:8px">+ Add Column</button>
    </div>
    <input type="hidden" id="<?= esc_attr($id_prefix) ?>-cols-json" name="<?= esc_attr($id_prefix) ?>_cols_json" value="">

    <h4 style="margin:16px 0 6px">Rows</h4>
    <div id="<?= esc_attr($id_prefix) ?>-rows" style="overflow-x:auto;">
        <table class="wp-list-table widefat fixed striped" id="<?= esc_attr($id_prefix) ?>-rows-table" style="table-layout:auto;min-width:500px;">
            <thead><tr id="<?= esc_attr($id_prefix) ?>-rows-head"></tr></thead>
            <tbody id="<?= esc_attr($id_prefix) ?>-rows-body"></tbody>
        </table>
        <button type="button" class="button sasanperfumes-sg-add-row" data-prefix="<?= esc_attr($id_prefix) ?>" style="margin-top:8px">+ Add Row</button>
    </div>
    <input type="hidden" id="<?= esc_attr($id_prefix) ?>-rows-json" name="<?= esc_attr($id_prefix) ?>_rows_json" value="">

    <script>
    (function(){
        var prefix = <?= json_encode($id_prefix) ?>;
        var savedCols = <?= $cols_json ?: '[]' ?>;
        var savedRows = <?= $rows_json ?: '[]' ?>;

        var SAMPLES = {
            shirt: {
                columns: [
                    {key:'size',label_en:'Size',label_ar:'المقاس',type:'text'},
                    {key:'chest',label_en:'Chest',label_ar:'الصدر',type:'measurement'},
                    {key:'length',label_en:'Length',label_ar:'الطول',type:'measurement'},
                    {key:'shoulder',label_en:'Shoulder',label_ar:'الكتف',type:'measurement'},
                    {key:'sleeve',label_en:'Sleeve Length',label_ar:'طول الكم',type:'measurement'},
                    {key:'cuff',label_en:'Cuff',label_ar:'الكفة',type:'measurement'}
                ],
                rows: [
                    {size:'S',chest:{cm:'98.7',in:'38.9'},length:{cm:'56',in:'22.0'},shoulder:{cm:'44',in:'17.3'},sleeve:{cm:'19.5',in:'7.7'},cuff:{cm:'38.5',in:'15.2'}},
                    {size:'M',chest:{cm:'102.7',in:'40.4'},length:{cm:'57',in:'22.4'},shoulder:{cm:'45.5',in:'17.9'},sleeve:{cm:'20.3',in:'8.0'},cuff:{cm:'39.9',in:'15.7'}},
                    {size:'L',chest:{cm:'108.7',in:'42.8'},length:{cm:'58.5',in:'23.0'},shoulder:{cm:'47',in:'18.5'},sleeve:{cm:'21.3',in:'8.4'},cuff:{cm:'42.1',in:'16.6'}},
                    {size:'XL',chest:{cm:'114.7',in:'45.2'},length:{cm:'60',in:'23.6'},shoulder:{cm:'48.5',in:'19.1'},sleeve:{cm:'22.3',in:'8.8'},cuff:{cm:'44.3',in:'17.4'}}
                ]
            },
            pant: {
                columns: [
                    {key:'size',label_en:'Size',label_ar:'المقاس',type:'text'},
                    {key:'waist',label_en:'Waist',label_ar:'الخصر',type:'measurement'},
                    {key:'hip',label_en:'Hip',label_ar:'الورك',type:'measurement'},
                    {key:'front_rise',label_en:'Front Rise',label_ar:'الارتفاع الأمامي',type:'measurement'},
                    {key:'thigh',label_en:'Thigh',label_ar:'الفخذ',type:'measurement'},
                    {key:'inseam',label_en:'Inseam',label_ar:'الخياطة الداخلية',type:'measurement'},
                    {key:'leg_opening',label_en:'Leg Opening',label_ar:'فتحة الساق',type:'measurement'}
                ],
                rows: [
                    {size:'30',waist:{cm:'78',in:'30.7'},hip:{cm:'96',in:'37.8'},front_rise:{cm:'27',in:'10.6'},thigh:{cm:'58',in:'22.8'},inseam:{cm:'76',in:'29.9'},leg_opening:{cm:'34',in:'13.4'}},
                    {size:'32',waist:{cm:'82',in:'32.3'},hip:{cm:'100',in:'39.4'},front_rise:{cm:'28',in:'11.0'},thigh:{cm:'60',in:'23.6'},inseam:{cm:'77',in:'30.3'},leg_opening:{cm:'35',in:'13.8'}},
                    {size:'34',waist:{cm:'86',in:'33.9'},hip:{cm:'104',in:'40.9'},front_rise:{cm:'29',in:'11.4'},thigh:{cm:'62',in:'24.4'},inseam:{cm:'78',in:'30.7'},leg_opening:{cm:'36',in:'14.2'}},
                    {size:'36',waist:{cm:'90',in:'35.4'},hip:{cm:'108',in:'42.5'},front_rise:{cm:'30',in:'11.8'},thigh:{cm:'64',in:'25.2'},inseam:{cm:'79',in:'31.1'},leg_opening:{cm:'37',in:'14.6'}}
                ]
            },
            short: {
                columns: [
                    {key:'size',label_en:'Size',label_ar:'المقاس',type:'text'},
                    {key:'waist',label_en:'Waist',label_ar:'الخصر',type:'measurement'},
                    {key:'hip',label_en:'Hip',label_ar:'الورك',type:'measurement'},
                    {key:'rise',label_en:'Rise',label_ar:'الارتفاع',type:'measurement'},
                    {key:'thigh',label_en:'Thigh',label_ar:'الفخذ',type:'measurement'},
                    {key:'inseam',label_en:'Inseam',label_ar:'الخياطة الداخلية',type:'measurement'},
                    {key:'leg_opening',label_en:'Leg Opening',label_ar:'فتحة الساق',type:'measurement'}
                ],
                rows: [
                    {size:'S',waist:{cm:'76',in:'29.9'},hip:{cm:'98',in:'38.6'},rise:{cm:'28',in:'11.0'},thigh:{cm:'62',in:'24.4'},inseam:{cm:'18',in:'7.1'},leg_opening:{cm:'54',in:'21.3'}},
                    {size:'M',waist:{cm:'80',in:'31.5'},hip:{cm:'102',in:'40.2'},rise:{cm:'29',in:'11.4'},thigh:{cm:'64',in:'25.2'},inseam:{cm:'19',in:'7.5'},leg_opening:{cm:'56',in:'22.0'}},
                    {size:'L',waist:{cm:'84',in:'33.1'},hip:{cm:'106',in:'41.7'},rise:{cm:'30',in:'11.8'},thigh:{cm:'66',in:'26.0'},inseam:{cm:'20',in:'7.9'},leg_opening:{cm:'58',in:'22.8'}},
                    {size:'XL',waist:{cm:'88',in:'34.6'},hip:{cm:'110',in:'43.3'},rise:{cm:'31',in:'12.2'},thigh:{cm:'68',in:'26.8'},inseam:{cm:'21',in:'8.3'},leg_opening:{cm:'60',in:'23.6'}}
                ]
            },
            jacket: {
                columns: [
                    {key:'size',label_en:'Size',label_ar:'المقاس',type:'text'},
                    {key:'chest',label_en:'Chest',label_ar:'الصدر',type:'measurement'},
                    {key:'length',label_en:'Length',label_ar:'الطول',type:'measurement'},
                    {key:'shoulder',label_en:'Shoulder',label_ar:'الكتف',type:'measurement'},
                    {key:'sleeve',label_en:'Sleeve Length',label_ar:'طول الكم',type:'measurement'},
                    {key:'hem',label_en:'Hem',label_ar:'الحاشية',type:'measurement'}
                ],
                rows: [
                    {size:'S',chest:{cm:'98',in:'38.6'},length:{cm:'68',in:'26.8'},shoulder:{cm:'43',in:'16.9'},sleeve:{cm:'62',in:'24.4'},hem:{cm:'96',in:'37.8'}},
                    {size:'M',chest:{cm:'103',in:'40.6'},length:{cm:'70',in:'27.6'},shoulder:{cm:'44.5',in:'17.5'},sleeve:{cm:'63',in:'24.8'},hem:{cm:'101',in:'39.8'}},
                    {size:'L',chest:{cm:'109',in:'42.9'},length:{cm:'72',in:'28.3'},shoulder:{cm:'46',in:'18.1'},sleeve:{cm:'64',in:'25.2'},hem:{cm:'107',in:'42.1'}},
                    {size:'XL',chest:{cm:'115',in:'45.3'},length:{cm:'74',in:'29.1'},shoulder:{cm:'47.5',in:'18.7'},sleeve:{cm:'65',in:'25.6'},hem:{cm:'113',in:'44.5'}}
                ]
            }
        };

        var state = { columns: savedCols.slice(), rows: savedRows.slice() };

        function cmToIn(cm) {
            var n = parseFloat(cm);
            return isNaN(n) ? '' : (n / 2.54).toFixed(1);
        }

        function syncJson() {
            document.getElementById(prefix+'-cols-json').value = JSON.stringify(state.columns);
            document.getElementById(prefix+'-rows-json').value = JSON.stringify(state.rows);
        }

        function renderColsTable() {
            var tbody = document.getElementById(prefix+'-cols-body');
            tbody.innerHTML = '';
            state.columns.forEach(function(col, ci) {
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td>'+(ci+1)+'</td>'+
                    '<td><input type="text" value="'+escAttr(col.key)+'" style="width:100%" placeholder="e.g. chest" data-col="'+ci+'" data-field="key"></td>'+
                    '<td><input type="text" value="'+escAttr(col.label_en)+'" style="width:100%" data-col="'+ci+'" data-field="label_en"></td>'+
                    '<td><input type="text" value="'+escAttr(col.label_ar||'')+'" style="width:100%" dir="rtl" data-col="'+ci+'" data-field="label_ar"></td>'+
                    '<td><select data-col="'+ci+'" data-field="type"><option value="text"'+(col.type==='text'?' selected':'')+'>Text</option><option value="measurement"'+(col.type==='measurement'?' selected':'')+'>Measurement (CM/IN)</option></select></td>'+
                    '<td><button type="button" class="button button-small" data-remove-col="'+ci+'" style="color:red">✕</button></td>';
                tbody.appendChild(tr);
            });
            renderRowsTable();
        }

        function renderRowsTable() {
            var thead = document.getElementById(prefix+'-rows-head');
            var tbody = document.getElementById(prefix+'-rows-body');
            thead.innerHTML = '';
            tbody.innerHTML = '';

            // Build header
            var th = '<th style="width:40px">#</th>';
            state.columns.forEach(function(col) {
                if (col.type === 'measurement') {
                    th += '<th>'+escHtml(col.label_en)+'<br><small style="font-weight:normal;color:#666">CM / IN</small></th>';
                } else {
                    th += '<th>'+escHtml(col.label_en)+'</th>';
                }
            });
            th += '<th style="width:50px">Del</th>';
            thead.innerHTML = th;

            state.rows.forEach(function(row, ri) {
                var tr = document.createElement('tr');
                var td = '<td>'+(ri+1)+'</td>';
                state.columns.forEach(function(col) {
                    var k = col.key;
                    if (col.type === 'measurement') {
                        var val = row[k] || {cm:'',in:''};
                        td += '<td style="min-width:110px">'+
                            '<input type="text" value="'+escAttr(val.cm||'')+'" placeholder="cm" style="width:48%;margin-right:2%" data-row="'+ri+'" data-col="'+k+'" data-unit="cm">'+
                            '<input type="text" value="'+escAttr(val.in||'')+'" placeholder="in" style="width:48%" data-row="'+ri+'" data-col="'+k+'" data-unit="in">'+
                            '</td>';
                    } else {
                        td += '<td><input type="text" value="'+escAttr(row[k]||'')+'" style="width:100%" data-row="'+ri+'" data-col="'+k+'" data-unit="text"></td>';
                    }
                });
                td += '<td><button type="button" class="button button-small" data-remove-row="'+ri+'" style="color:red">✕</button></td>';
                tr.innerHTML = td;
                tbody.appendChild(tr);
            });
        }

        function escAttr(s) { return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
        function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

        function handleColsBodyChange(e) {
            var el = e.target;
            var ci = el.dataset.col;
            var field = el.dataset.field;
            if (ci === undefined || !field) return;
            state.columns[ci][field] = el.value;
            if (field === 'type' || field === 'key') renderColsTable();
            else syncJson();
        }

        function handleRowsBodyChange(e) {
            var el = e.target;
            var ri = el.dataset.row;
            var col = el.dataset.col;
            var unit = el.dataset.unit;
            if (ri === undefined || !col) return;
            if (unit === 'text') {
                state.rows[ri][col] = el.value;
            } else {
                if (!state.rows[ri][col] || typeof state.rows[ri][col] !== 'object') state.rows[ri][col] = {cm:'',in:''};
                state.rows[ri][col][unit] = el.value;
                if (unit === 'cm' && el.value && !state.rows[ri][col].in) {
                    // auto-fill IN if blank
                    var sibling = el.parentNode.querySelector('[data-unit="in"]');
                    if (sibling && !sibling.value) {
                        var auto = cmToIn(el.value);
                        sibling.value = auto;
                        state.rows[ri][col].in = auto;
                    }
                }
            }
            syncJson();
        }

        document.getElementById(prefix+'-cols-body').addEventListener('change', handleColsBodyChange);
        document.getElementById(prefix+'-cols-body').addEventListener('input', function(e){ handleColsBodyChange(e); });
        document.getElementById(prefix+'-rows-body').addEventListener('change', handleRowsBodyChange);
        document.getElementById(prefix+'-rows-body').addEventListener('input', function(e){ handleRowsBodyChange(e); });

        document.getElementById(prefix+'-cols-body').addEventListener('click', function(e) {
            var btn = e.target.closest('[data-remove-col]');
            if (!btn) return;
            var ci = parseInt(btn.dataset.removeCol);
            var key = state.columns[ci].key;
            state.columns.splice(ci, 1);
            state.rows.forEach(function(r){ delete r[key]; });
            renderColsTable();
            syncJson();
        });

        document.getElementById(prefix+'-rows-body').addEventListener('click', function(e) {
            var btn = e.target.closest('[data-remove-row]');
            if (!btn) return;
            state.rows.splice(parseInt(btn.dataset.removeRow), 1);
            renderRowsTable();
            syncJson();
        });

        document.querySelector('.sasanperfumes-sg-add-col[data-prefix="'+prefix+'"]').addEventListener('click', function() {
            state.columns.push({key:'col'+(state.columns.length+1),label_en:'Column',label_ar:'',type:'measurement'});
            renderColsTable();
            syncJson();
        });

        document.querySelector('.sasanperfumes-sg-add-row[data-prefix="'+prefix+'"]').addEventListener('click', function() {
            var row = {};
            state.columns.forEach(function(col) {
                row[col.key] = col.type === 'measurement' ? {cm:'',in:''} : '';
            });
            state.rows.push(row);
            renderRowsTable();
            syncJson();
        });

        document.querySelectorAll('.sasanperfumes-sg-load-sample[data-prefix="'+prefix+'"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var type = btn.dataset.type;
                if (!SAMPLES[type]) return;
                if (!confirm('Load "'+type+'" sample data? This will replace current columns and rows.')) return;
                state.columns = SAMPLES[type].columns.slice();
                state.rows = SAMPLES[type].rows.slice();
                renderColsTable();
                syncJson();
            });
        });

        renderColsTable();
        syncJson();
    })();
    </script>
    <?php
}

// ---- Product chart metabox ----
function sasanperfumes_sg_mb_product_chart($post) {
    sasanperfumes_sg_render_chart_builder($post, '_sg_product_columns', '_sg_product_rows', 'Product Chart', 'sg_pc');
}

// ---- Body chart metabox ----
function sasanperfumes_sg_mb_body_chart($post) {
    $enabled = (bool) get_post_meta($post->ID, '_sg_enable_body_chart', true);
    if (!$enabled) {
        echo '<p>Enable "Body Chart" in <strong>Basic Info</strong> to edit this section.</p>';
        sasanperfumes_sg_render_chart_builder($post, '_sg_body_columns', '_sg_body_rows', 'Body Chart', 'sg_bc');
        return;
    }
    sasanperfumes_sg_render_chart_builder($post, '_sg_body_columns', '_sg_body_rows', 'Body Chart', 'sg_bc');
}

// ---- How to Measure metabox ----
function sasanperfumes_sg_mb_measure($post) {
    $sections = get_post_meta($post->ID, '_sg_measurement_sections', true);
    if (!is_array($sections) || empty($sections)) {
        $sections = sasanperfumes_sg_default_measurement_sections();
    }
    ?>
    <p class="description">Add measurement instruction sections. Each section can have a title, description, and an uploaded image.</p>
    <div id="sg-measure-sections">
        <?php foreach ($sections as $i => $s): ?>
        <div class="sasanperfumes-repeater-item" style="background:#f9f9f9;padding:15px;margin-bottom:12px;border:1px solid #ddd;border-radius:4px;">
            <h4 style="margin:0 0 10px">
                Section <?= $i + 1 ?>
                <button type="button" class="button sasanperfumes-remove-repeater-item" style="float:right;color:red">Remove</button>
            </h4>
            <table class="form-table" style="margin:0">
                <tr>
                    <th style="width:130px">Title (EN)</th>
                    <td><input type="text" name="sg_measure[<?= $i ?>][title_en]" value="<?= esc_attr($s['title_en'] ?? '') ?>" class="large-text"></td>
                </tr>
                <tr>
                    <th>Title (AR)</th>
                    <td><input type="text" name="sg_measure[<?= $i ?>][title_ar]" value="<?= esc_attr($s['title_ar'] ?? '') ?>" class="large-text" dir="rtl"></td>
                </tr>
                <tr>
                    <th>Description (EN)</th>
                    <td><textarea name="sg_measure[<?= $i ?>][desc_en]" rows="2" class="large-text"><?= esc_textarea($s['desc_en'] ?? '') ?></textarea></td>
                </tr>
                <tr>
                    <th>Description (AR)</th>
                    <td><textarea name="sg_measure[<?= $i ?>][desc_ar]" rows="2" class="large-text" dir="rtl"><?= esc_textarea($s['desc_ar'] ?? '') ?></textarea></td>
                </tr>
                <tr>
                    <th>Image URL</th>
                    <td>
                        <?php sasanperfumes_image_field('sg_measure['.$i.'][image_url]', $s['image_url'] ?? ''); ?>
                    </td>
                </tr>
            </table>
        </div>
        <?php endforeach; ?>
    </div>
    <button type="button" class="button sasanperfumes-sp-add" data-target="sg-measure-sections">+ Add Section</button>
    <script>
    // Template for new measure section
    document.addEventListener('DOMContentLoaded', function() {
        window.sasanperfumesSgMeasureTemplate = function(i) {
            return '<div class="sasanperfumes-repeater-item" style="background:#f9f9f9;padding:15px;margin-bottom:12px;border:1px solid #ddd;border-radius:4px;">' +
                '<h4 style="margin:0 0 10px">Section '+(i+1)+'<button type="button" class="button sasanperfumes-remove-repeater-item" style="float:right;color:red">Remove</button></h4>' +
                '<table class="form-table" style="margin:0">' +
                '<tr><th style="width:130px">Title (EN)</th><td><input type="text" name="sg_measure['+i+'][title_en]" value="" class="large-text"></td></tr>' +
                '<tr><th>Title (AR)</th><td><input type="text" name="sg_measure['+i+'][title_ar]" value="" class="large-text" dir="rtl"></td></tr>' +
                '<tr><th>Description (EN)</th><td><textarea name="sg_measure['+i+'][desc_en]" rows="2" class="large-text"></textarea></td></tr>' +
                '<tr><th>Description (AR)</th><td><textarea name="sg_measure['+i+'][desc_ar]" rows="2" class="large-text" dir="rtl"></textarea></td></tr>' +
                '<tr><th>Image URL</th><td><input type="url" name="sg_measure['+i+'][image_url]" value="" class="large-text"><br><small>Paste image URL or use the media uploader above.</small></td></tr>' +
                '</table></div>';
        };
    });
    </script>
    <?php
}

// ---- Category Assignment metabox ----
function sasanperfumes_sg_mb_assignment($post) {
    $assigned_cats = get_post_meta($post->ID, '_sg_category_ids', true);
    if (!is_array($assigned_cats)) $assigned_cats = [];
    $categories = get_terms(['taxonomy' => 'product_cat', 'hide_empty' => false, 'orderby' => 'name']);
    ?>
    <p class="description">Assign this template to product categories. Products in these categories will use this guide unless they have a product-level override.</p>
    <div style="max-height:300px;overflow-y:auto;border:1px solid #ddd;padding:10px;border-radius:4px;margin-top:8px">
        <?php if (!is_wp_error($categories) && $categories): ?>
            <?php foreach ($categories as $cat): ?>
                <label style="display:block;margin-bottom:6px">
                    <input type="checkbox" name="sg_category_ids[]" value="<?= esc_attr($cat->term_id) ?>" <?= in_array($cat->term_id, $assigned_cats) ? 'checked' : '' ?>>
                    <?= esc_html($cat->name) ?> (<?= $cat->count ?>)
                </label>
            <?php endforeach; ?>
        <?php else: ?>
            <p style="color:#666">No product categories found.</p>
        <?php endif; ?>
    </div>
    <p style="margin-top:8px"><em>Priority: Product override &gt; Category assignment &gt; No guide</em></p>
    <?php
}

// ---- Product metabox (on WC product edit screen) ----
function sasanperfumes_sg_add_product_metabox() {
    add_meta_box('sasanperfumes_sg_product', 'Size Guide', 'sasanperfumes_sg_product_mb_render', 'product', 'side', 'default');
}

function sasanperfumes_sg_product_mb_render($post) {
    wp_nonce_field('sasanperfumes_sg_product_save', 'sasanperfumes_sg_product_nonce');
    $current = (int) get_post_meta($post->ID, '_sasanperfumes_size_guide_id', true);
    $templates = get_posts(['post_type' => 'sasanperfumes_size_guide', 'post_status' => 'publish', 'posts_per_page' => -1, 'orderby' => 'title', 'order' => 'ASC']);
    ?>
    <p><select name="sasanperfumes_size_guide_id" style="width:100%">
        <option value="0" <?= selected($current, 0, false) ?>>Auto (use category assignment)</option>
        <option value="-1" <?= selected($current, -1, false) ?>>Hide size guide for this product</option>
        <?php foreach ($templates as $t): ?>
            <option value="<?= $t->ID ?>" <?= selected($current, $t->ID, false) ?>><?= esc_html($t->post_title) ?></option>
        <?php endforeach; ?>
    </select></p>
    <p class="description">Override the category-based assignment for this product.</p>
    <?php
}

// ---------------------------------------------------------------------------
// Save Handlers
// ---------------------------------------------------------------------------

function sasanperfumes_sg_save_meta($post_id, $post) {
    if (!isset($_POST['sasanperfumes_sg_nonce']) || !wp_verify_nonce($_POST['sasanperfumes_sg_nonce'], 'sasanperfumes_sg_save')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    // Basic fields
    $fields = ['_sg_title_en', '_sg_title_ar', '_sg_default_unit', '_sg_fit_type', '_sg_note_en', '_sg_note_ar'];
    $keys   = ['sg_title_en', 'sg_title_ar', 'sg_default_unit', 'sg_fit_type', 'sg_note_en', 'sg_note_ar'];
    foreach (array_combine($fields, $keys) as $meta_key => $post_key) {
        update_post_meta($post_id, $meta_key, sanitize_text_field($_POST[$post_key] ?? ''));
    }
    update_post_meta($post_id, '_sg_enable_body_chart', !empty($_POST['sg_enable_body_chart']) ? 1 : 0);

    // Chart data — stored as JSON arrays
    foreach (['sg_pc' => ['_sg_product_columns', '_sg_product_rows'], 'sg_bc' => ['_sg_body_columns', '_sg_body_rows']] as $prefix => $metas) {
        $cols_json = stripslashes($_POST[$prefix.'_cols_json'] ?? '[]');
        $rows_json = stripslashes($_POST[$prefix.'_rows_json'] ?? '[]');
        $cols = json_decode($cols_json, true);
        $rows = json_decode($rows_json, true);
        update_post_meta($post_id, $metas[0], is_array($cols) ? $cols : []);
        update_post_meta($post_id, $metas[1], is_array($rows) ? $rows : []);
    }

    // Measurement sections
    $sections = [];
    if (isset($_POST['sg_measure']) && is_array($_POST['sg_measure'])) {
        foreach ($_POST['sg_measure'] as $s) {
            if (!empty($s['title_en']) || !empty($s['title_ar']) || !empty($s['desc_en'])) {
                $sections[] = [
                    'title_en'  => sanitize_text_field($s['title_en'] ?? ''),
                    'title_ar'  => sanitize_text_field($s['title_ar'] ?? ''),
                    'desc_en'   => sanitize_textarea_field($s['desc_en'] ?? ''),
                    'desc_ar'   => sanitize_textarea_field($s['desc_ar'] ?? ''),
                    'image_url' => esc_url_raw($s['image_url'] ?? ''),
                ];
            }
        }
    }
    update_post_meta($post_id, '_sg_measurement_sections', $sections);

    // Category IDs
    $cat_ids = array_map('absint', (array) ($_POST['sg_category_ids'] ?? []));
    update_post_meta($post_id, '_sg_category_ids', $cat_ids);
}

function sasanperfumes_sg_save_product_meta($post_id) {
    if (!isset($_POST['sasanperfumes_sg_product_nonce']) || !wp_verify_nonce($_POST['sasanperfumes_sg_product_nonce'], 'sasanperfumes_sg_product_save')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;
    update_post_meta($post_id, '_sasanperfumes_size_guide_id', (int) ($_POST['sasanperfumes_size_guide_id'] ?? 0));
}

// ---------------------------------------------------------------------------
// Template Resolution
// ---------------------------------------------------------------------------

function sasanperfumes_sg_resolve_template_for_product($product_id) {
    // 1. Product-level override
    $override = (int) get_post_meta($product_id, '_sasanperfumes_size_guide_id', true);
    if ($override === -1) return null; // explicitly hidden
    if ($override > 0) {
        $post = get_post($override);
        if ($post && $post->post_status === 'publish') return $post;
    }

    // 2. Category assignment — find template that has this product's category
    $cat_ids = wp_get_post_terms($product_id, 'product_cat', ['fields' => 'ids']);
    if (is_wp_error($cat_ids) || empty($cat_ids)) return null;

    $templates = get_posts(['post_type' => 'sasanperfumes_size_guide', 'post_status' => 'publish', 'posts_per_page' => -1]);
    foreach ($templates as $t) {
        $assigned = get_post_meta($t->ID, '_sg_category_ids', true);
        if (is_array($assigned) && array_intersect($assigned, $cat_ids)) return $t;
    }

    return null;
}

// ---------------------------------------------------------------------------
// Template Formatter
// ---------------------------------------------------------------------------

function sasanperfumes_sg_format_template($post) {
    $id = $post->ID;
    $g = fn($k, $d = '') => get_post_meta($id, $k, true) ?: $d;

    $prod_cols = get_post_meta($id, '_sg_product_columns', true);
    $prod_rows = get_post_meta($id, '_sg_product_rows', true);
    $body_cols = get_post_meta($id, '_sg_body_columns', true);
    $body_rows = get_post_meta($id, '_sg_body_rows', true);
    $sections  = get_post_meta($id, '_sg_measurement_sections', true);
    $enable_body = (bool) $g('_sg_enable_body_chart', 0);

    $product_chart = null;
    if (is_array($prod_cols) && !empty($prod_cols)) {
        $product_chart = [
            'columns' => $prod_cols,
            'rows'    => is_array($prod_rows) ? $prod_rows : [],
        ];
    }

    $body_chart = null;
    if ($enable_body && is_array($body_cols) && !empty($body_cols)) {
        $body_chart = [
            'columns' => $body_cols,
            'rows'    => is_array($body_rows) ? $body_rows : [],
        ];
    }

    return [
        'id'          => $id,
        'title'       => ['en' => $g('_sg_title_en', get_the_title($post)), 'ar' => $g('_sg_title_ar')],
        'default_unit'=> $g('_sg_default_unit', 'cm'),
        'fit_type'    => $g('_sg_fit_type', 'regular'),
        'note'        => ['en' => $g('_sg_note_en', 'This data was obtained from manually measuring the product, it may be off by 1–2 CM.'), 'ar' => $g('_sg_note_ar')],
        'product_chart'        => $product_chart,
        'body_chart'           => $body_chart,
        'measurement_sections' => is_array($sections) ? $sections : [],
    ];
}

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

function sasanperfumes_sg_register_routes() {
    sasanperfumes_register_rest_route( '/size-guide', [
        'methods'             => 'GET',
        'callback'            => 'sasanperfumes_sg_api_get',
        'permission_callback' => '__return_true',
        'args'                => [
            'product_id' => ['required' => true, 'type' => 'integer', 'sanitize_callback' => 'absint'],
        ],
    ]);
}

function sasanperfumes_sg_api_get($request) {
    $product_id = (int) $request->get_param('product_id');
    if (!$product_id) {
        return rest_ensure_response(['enabled' => false, 'template' => null]);
    }

    $template_post = sasanperfumes_sg_resolve_template_for_product($product_id);
    if (!$template_post) {
        return rest_ensure_response(['enabled' => false, 'template' => null]);
    }

    return rest_ensure_response([
        'enabled'  => true,
        'template' => sasanperfumes_sg_format_template($template_post),
    ]);
}

// ---------------------------------------------------------------------------
// Default Measurement Sections
// ---------------------------------------------------------------------------

function sasanperfumes_sg_default_measurement_sections() {
    return [
        ['title_en' => 'Chest', 'title_ar' => 'الصدر', 'desc_en' => 'Measure from the stitches below the armpits on one side to the other.', 'desc_ar' => 'قم بالقياس من الخياطة أسفل الإبط من جهة إلى الجهة الأخرى.', 'image_url' => ''],
        ['title_en' => 'Length', 'title_ar' => 'الطول', 'desc_en' => 'Measure from the highest shoulder point down to the bottom hem.', 'desc_ar' => 'قم بالقياس من أعلى نقطة في الكتف حتى الحافة السفلية.', 'image_url' => ''],
        ['title_en' => 'Shoulder', 'title_ar' => 'الكتف', 'desc_en' => 'Measure straight across from one shoulder seam to the other.', 'desc_ar' => 'قم بالقياس بشكل مستقيم من خياطة الكتف إلى خياطة الكتف الأخرى.', 'image_url' => ''],
        ['title_en' => 'Sleeve Length', 'title_ar' => 'طول الكم', 'desc_en' => 'Measure from the shoulder seam to the end of the sleeve.', 'desc_ar' => 'قم بالقياس من خياطة الكتف حتى نهاية الكم.', 'image_url' => ''],
        ['title_en' => 'Waist', 'title_ar' => 'الخصر', 'desc_en' => 'Measure straight across the waistband from one side to the other.', 'desc_ar' => 'قم بالقياس بشكل مستقيم عبر الخصر من جهة إلى الجهة الأخرى.', 'image_url' => ''],
        ['title_en' => 'Inseam', 'title_ar' => 'الخياطة الداخلية', 'desc_en' => 'Measure from the crotch seam down to the bottom hem.', 'desc_ar' => 'قم بالقياس من خياطة أسفل الوسط حتى الحافة السفلية.', 'image_url' => ''],
    ];
}
