<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <!-- FIX(drobne): usunięto maximum-scale=1.0 — blokowanie zoomu psuje dostępność -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- FIX(drobne): meta description, Open Graph, theme-color, emoji favicon -->
    <meta name="description" content="Aplikacja do rozliczeń tenis stołowy — śledź obecność i długi">
    <meta name="theme-color" content="#1e3c72">
    <meta property="og:title" content="🏓 Rozliczenia Tenis Stołowy">
    <meta property="og:description" content="Zarządzaj płatnościami i śledź statystyki">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏓</text></svg>">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/icon-192.png">

    <title>🏓 Rozliczenia Tenis Stołowy</title>

    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>

    <style>
        :root {
            --color-primary:      #1e3c72;
            --color-primary-mid:  #2a5298;
            --color-success:      #51cf66;
            --color-success-dark: #37b24d;
            --color-danger:       #ff6b6b;
            --color-danger-dark:  #ee5a6f;
            --color-warning:      #ffd700;
            --color-warning-dark: #ffed4e;
            --color-multi:        #74b9ff;
            --color-multi-dark:   #0984e3;
            --color-organizer:    #f39c12;
            --radius-card:        20px;
            --radius-btn:         12px;
            --shadow-card:        0 8px 20px rgba(0,0,0,0.15);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        :focus-visible {
            outline: 3px solid var(--color-primary-mid);
            outline-offset: 3px;
            border-radius: 4px;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 10px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: var(--radius-card);
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: clip;
        }

        /* Header */
        header {
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-mid) 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header-main {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }
        .header-main h1 {
            font-size: 1.8em;
            margin-bottom: 0;
        }
        .header-main p {
            opacity: 0.9;
            font-size: 0.9em;
        }

        .blik-header-info {
            margin-top: 10px;
            padding: 10px 18px;
            background: var(--color-warning);
            color: var(--color-primary);
            border-radius: 50px;
            cursor: pointer;
            font-weight: bold;
            font-size: 1em;
            display: inline-flex;
            flex-direction: row;
            align-items: center;
            gap: 8px;
            border: 2px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            transition: transform 0.2s;
            font-family: inherit;
            white-space: nowrap;
            max-width: calc(100vw - 40px);
        }
        .blik-header-info:hover { transform: scale(1.02); background: var(--color-warning-dark); }
        .blik-header-info:active { transform: scale(0.98); }
        .blik-copy-hint {
            background: rgba(0,0,0,0.2);
            padding: 4px 10px;
            border-radius: 30px;
            font-size: 0.75rem;
            color: white;
            white-space: nowrap;
        }
        @media (max-width: 600px) {
            .blik-header-info {
                flex-direction: column;
                gap: 4px;
                text-align: center;
            }
            .blik-copy-hint {
                font-size: 0.7rem;
                padding: 3px 10px;
            }
        }

        .sync-status-header {
            margin-top: 10px;
            margin-left: 10px;
            padding: 12px 25px;
            background: rgba(255,255,255,0.2);
            border-radius: 40px;
            font-size: 0.9em;
            font-weight: bold;
            display: inline-block;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .sync-status-header.connected    { background: #27ae60; color: white; }
        .sync-status-header.disconnected { background: #c0392b; color: white; }

        nav {
            display: flex;
            justify-content: flex-start;
            background: #f8f9fa;
            padding: 10px;
            gap: 8px;
            flex-wrap: nowrap;
            overflow-x: scroll;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }
        nav::-webkit-scrollbar { display: none; }
        .tab-btn {
            padding: 12px 24px;
            background: white;
            border: 2px solid #ddd;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1em;
            font-weight: bold;
            transition: all 0.3s;
            white-space: nowrap;
            font-family: inherit;
        }
        .tab-btn:hover  { background: #667eea; color: white; border-color: #667eea; }
        .tab-btn.active,
        .tab-btn[aria-selected="true"] {
            background: var(--color-primary);
            color: white;
            border-color: var(--color-primary);
        }

        .content { padding: 15px; }
        .tab-content          { display: none; }
        .tab-content.active   { display: block; }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }
        .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .summary-card.danger  { background: linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger-dark) 100%); }
        .summary-card.success { background: linear-gradient(135deg, var(--color-success) 0%, var(--color-success-dark) 100%); }
        .summary-value { font-size: 2em; font-weight: bold; margin: 5px 0; }

        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .dashboard-header h2 { font-size: 1.3em; color: var(--color-primary); }

        .filter-toggle {
            background: #ecf0f1;
            padding: 10px 18px;
            border-radius: 30px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            border: 2px solid #b0bec5;
            font-family: inherit;
            font-size: 0.95em;
            font-weight: bold;
        }
        .filter-toggle.active { background: #27ae60; color: white; border-color: #229954; }
        .filter-toggle input  { display: none; }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 10px;
        }
        .player-card {
            padding: 20px;
            border-radius: var(--radius-card);
            box-shadow: var(--shadow-card);
            transition: transform 0.2s;
            position: relative;
            border: 3px solid white;
        }
        .player-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.2); }
        .player-card.debt      { background: linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger-dark) 100%); color: white; }
        .player-card.paid      { background: linear-gradient(135deg, var(--color-success) 0%, var(--color-success-dark) 100%); color: white; }
        .player-card.organizer { background: linear-gradient(135deg, var(--color-warning) 0%, var(--color-warning-dark) 100%); color: #333; }
        .player-card.multi     { background: linear-gradient(135deg, var(--color-multi) 0%, var(--color-multi-dark) 100%); color: white; }

        .rank-badge {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(0,0,0,0.3);
            padding: 6px 14px;
            border-radius: 30px;
            font-weight: bold;
            font-size: 0.9em;
            color: white;
            border: 1px solid rgba(255,255,255,0.5);
            backdrop-filter: blur(5px);
        }

        .player-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .avatar {
            width: 50px; height: 50px;
            border-radius: 50%;
            background: var(--color-primary);
            color: white;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5em; font-weight: bold; text-transform: uppercase;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            border: 2px solid rgba(255,255,255,0.5);
        }
        .player-card.debt      .avatar { background: #c0392b; }
        .player-card.paid      .avatar { background: #27ae60; }
        .player-card.organizer .avatar { background: var(--color-organizer); color: #2c3e50; }
        .player-card.multi     .avatar { background: #2980b9; }

        .player-name        { font-size: 1.8em; font-weight: bold; }
        .attendance-text    { font-size: 0.9em; margin-bottom: 5px; opacity: 0.9; }
        .attendance-bar-container {
            width: 100%; height: 12px;
            background: rgba(0,0,0,0.2);
            border-radius: 30px;
            margin: 10px 0; overflow: hidden;
        }
        .attendance-bar-fill { height: 100%; background: #e91e8c; border-radius: 30px; }

        .player-debt {
            font-size: 2.2em; font-weight: bold;
            margin: 15px 0; cursor: pointer;
            background: rgba(0,0,0,0.1);
            padding: 10px; border-radius: 15px;
            text-align: center;
            border: 2px solid rgba(255,255,255,0.3);
        }
        .copy-hint { display: block; font-size: 0.7em; opacity: 0.8; font-weight: normal; margin-top: 3px; }

        .details-btn {
            background: rgba(255,255,255,0.25);
            color: white; border: 2px solid white;
            padding: 12px; border-radius: var(--radius-btn);
            cursor: pointer; font-size: 1em;
            margin: 10px 0; width: 100%; font-weight: bold;
            font-family: inherit;
        }
        .pay-btn {
            width: 100%; padding: 16px; margin-top: 5px;
            background: white; color: #333;
            border: none; border-radius: var(--radius-btn);
            font-size: 1.1em; font-weight: bold;
            cursor: pointer; font-family: inherit;
        }
        .pay-btn.paid-btn { background: rgba(255,255,255,0.3); color: white; cursor: default; }

        .rank-legend {
            background: #f8f9fa; padding: 18px;
            border-radius: 15px; margin-top: 20px;
        }
        .rank-legend h3 { color: var(--color-primary); margin-bottom: 15px; font-size: 1.1em; }
        .rank-legend-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
        }
        .rank-legend-item {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 12px; background: white;
            border-radius: 8px; font-size: 0.95em;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .rank-legend-emoji { font-size: 1.3em; }

        .monthly-summary {
            background: #f8f9fa;
            border-radius: var(--radius-card);
            padding: 20px;
            margin-bottom: 20px;
        }
        .monthly-summary h2 { color: var(--color-primary); margin-bottom: 16px; font-size: 1.2em; }
        .monthly-table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
        .monthly-table th {
            background: var(--color-primary);
            color: white;
            padding: 10px 12px;
            text-align: left;
            font-weight: 700;
        }
        .monthly-table th:not(:first-child) { text-align: center; }
        .monthly-table td {
            padding: 9px 12px;
            border-bottom: 1px solid #e9ecef;
            vertical-align: middle;
        }
        .monthly-table td:not(:first-child) { text-align: center; }
        .monthly-table tr:nth-child(even) td { background: #f1f3f5; }
        .monthly-table tr:hover td { background: #e8eaf6; }
        .monthly-bar-wrap { display: flex; align-items: center; gap: 8px; }
        .monthly-bar-bg {
            flex: 1; height: 8px; background: #dee2e6;
            border-radius: 10px; overflow: hidden; min-width: 40px;
        }
        .monthly-bar-fill {
            height: 100%; background: #e91e8c;
            border-radius: 10px; transition: width 0.3s;
        }
        .monthly-pct { font-size: 0.8em; color: #666; min-width: 34px; }
        .monthly-present { font-weight: 700; color: var(--color-primary); }
        .month-header td {
            background: #e8eaf6 !important;
            font-weight: 700;
            color: var(--color-primary);
            font-size: 0.95em;
            letter-spacing: .03em;
        }

        .freq-chart-wrap {
            background: white;
            border-radius: 14px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .freq-chart-wrap h3 { color: var(--color-primary); font-size: 1em; margin-bottom: 4px; }
        .freq-chart-subtitle { font-size: 0.82em; color: #888; margin-bottom: 12px; }
        .chart-toggle-btns { display: flex; gap: 8px; margin-bottom: 16px; }
        .chart-toggle {
            padding: 7px 18px;
            border-radius: 30px;
            border: 2px solid #ddd;
            background: white;
            font-size: 0.88em; font-weight: bold;
            cursor: pointer; font-family: inherit;
            transition: all 0.2s;
        }
        .chart-toggle.active {
            background: var(--color-primary);
            color: white; border-color: var(--color-primary);
        }
        .freq-chart-canvas-wrap { position: relative; width: 100%; height: 260px; }
        #freqChart { width: 100% !important; height: 100% !important; }

        /* HALL OF FAME */
        #halloffame { padding: 0; }
        .hof-title { color: var(--color-primary); font-size: 1.2em; font-weight: 900; margin-bottom: 2px; }
        .hof-subtitle { color: #888; font-size: 0.82em; margin-bottom: 16px; }
        .hof-podium { display: flex; justify-content: center; align-items: flex-end; margin-bottom: 30px; }
        .hof-podium-slot { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; max-width: 120px; }
        .hof-avatar {
            width: 54px; height: 54px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5em; font-weight: 900; color: white;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5);
            border: 3px solid rgba(255,255,255,0.3);
            text-transform: uppercase;
        }
        .hof-podium-slot.first  .hof-avatar { border-color: #ffd700; box-shadow: 0 0 20px rgba(255,215,0,0.5); }
        .hof-podium-slot.second .hof-avatar { border-color: #c0c0c0; }
        .hof-podium-slot.third  .hof-avatar { border-color: #cd7f32; }
        .hof-podium-name  { font-size: 0.85em; font-weight: 700; color: #1a1a2e; text-align: center; }
        .hof-podium-count { font-size: 0.75em; color: #666; text-align: center; }
        .hof-podium-bar {
            width: 80%; border-radius: 8px 8px 0 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.4em;
        }
        .hof-podium-slot.first  .hof-podium-bar { background: linear-gradient(180deg,#ffd700,#f0a500); height: 90px; }
        .hof-podium-slot.second .hof-podium-bar { background: linear-gradient(180deg,#c0c0c0,#909090); height: 65px; }
        .hof-podium-slot.third  .hof-podium-bar { background: linear-gradient(180deg,#cd7f32,#a05c20); height: 45px; }
        .hof-chart-wrap { display: flex; align-items: center; justify-content: center; gap: 24px; flex-wrap: wrap; margin-bottom: 24px; }
        .hof-donut-container { position: relative; width: 200px; height: 200px; flex-shrink: 0; }
        #hofDonutChart { width: 100% !important; height: 100% !important; }
        .hof-donut-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; pointer-events: none; }
        .hof-legend { display: flex; flex-direction: column; gap: 8px; }
        .hof-legend-item { display: flex; align-items: center; gap: 10px; color: #333; font-size: 0.88em; }
        .hof-legend-dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
        .hof-legend-name { font-weight: 600; flex: 1; }
        .hof-legend-val  { color: #888; font-size: 0.85em; }
        .hof-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        @media (max-width: 500px) {
            .hof-stats { grid-template-columns: repeat(2, 1fr); }
            .hof-donut-container { width: 160px; height: 160px; }
        }
        .hof-stat-card {
            background: white; border: 1px solid #e9ecef;
            border-radius: 14px; padding: 14px 10px;
            text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .hof-stat-val { font-size: 1.6em; font-weight: 900; color: #1a1a2e; line-height: 1; }
        .hof-stat-val.gold    { color: #ffd700; }
        .hof-stat-val.magenta { color: #e91e8c; }
        .hof-stat-label { font-size: 0.72em; color: #888; margin-top: 5px; }
        .hof-donut-center-num   { font-size: 1.8em; font-weight: 900; color: #1a1a2e; line-height: 1; }
        .hof-donut-center-label { font-size: 0.68em; color: #888; margin-top: 2px; }
        .hof-empty { text-align: center; color: #aaa; padding: 60px 20px; font-size: 0.95em; }

        /* Panel Admina */
        .admin-section {
            background: #f8f9fa; padding: 20px;
            border-radius: var(--radius-card); margin-bottom: 20px;
        }
        .admin-section h2 { margin-bottom: 15px; color: var(--color-primary); font-size: 1.2em; }

        .form-group { margin-bottom: 18px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #333; }
        .form-group input {
            width: 100%; padding: 14px;
            border: 2px solid #ddd; border-radius: var(--radius-btn);
            font-size: 1em; font-family: inherit;
        }

        .cost-presets { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .preset-btn {
            padding: 12px 18px; background: white;
            border: 2px solid #ddd; border-radius: var(--radius-btn);
            cursor: pointer; font-weight: bold; font-family: inherit;
        }

        .checkbox-group {
            display: flex; flex-direction: column;
            gap: 8px; margin-top: 10px;
            background: white; padding: 15px;
            border-radius: var(--radius-btn); border: 1px solid #e0e0e0;
        }
        .checkbox-item {
            display: flex; align-items: center; gap: 12px;
            padding: 10px 12px; background: #f8f9fa;
            border-radius: 8px; cursor: pointer; width: 100%;
        }
        .checkbox-item:hover { background: #e9ecef; }
        .checkbox-item input[type="checkbox"] { width: 20px; height: 20px; cursor: pointer; }
        .checkbox-item label { cursor: pointer; font-size: 1.1em; flex: 1; margin-bottom: 0; font-weight: normal; }
        .checkbox-item.multi-item { background: #e3f2fd; border: 2px solid #3498db; }

        .submit-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; padding: 16px; border: none;
            border-radius: var(--radius-btn); font-size: 1.2em;
            font-weight: bold; cursor: pointer; width: 100%;
            font-family: inherit;
        }
        .submit-btn.edit-mode {
            background: linear-gradient(135deg, var(--color-organizer) 0%, #e67e22 100%);
        }
        .cancel-btn {
            background: #95a5a6; color: white; padding: 16px;
            border: none; border-radius: var(--radius-btn);
            font-size: 1.2em; cursor: pointer; width: 100%;
            margin-top: 10px; font-family: inherit;
        }
        .edit-mode-banner {
            background: linear-gradient(135deg, var(--color-organizer) 0%, #e67e22 100%);
            color: white; padding: 15px; border-radius: var(--radius-btn);
            margin-bottom: 15px; text-align: center;
            font-weight: bold; display: none;
        }
        .edit-mode-banner.active { display: block; }

        .modal {
            display: none; position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 3000;
            justify-content: center; align-items: center;
        }
        .modal.active { display: flex; }
        .modal-content {
            background: white; padding: 25px;
            border-radius: var(--radius-card); max-width: 400px;
            width: 90%; text-align: center;
        }
        .modal-content h2 { color: #c0392b; margin-bottom: 15px; font-size: 1.2em; }
        .modal-content input {
            width: 100%; padding: 15px;
            border: 2px solid #ddd; border-radius: 10px;
            font-size: 1.1em; margin: 15px 0;
            text-align: center; font-family: inherit;
        }
        .modal-buttons { display: flex; gap: 10px; }
        .modal-btn {
            flex: 1; padding: 14px; border: none;
            border-radius: 10px; font-weight: bold;
            cursor: pointer; font-family: inherit; font-size: 1em;
        }
        .modal-btn.confirm { background: #c0392b; color: white; }
        .modal-btn.cancel  { background: #ecf0f1; }

        .trash-section {
            background: #fff3e0; padding: 15px;
            border-radius: var(--radius-btn); margin-bottom: 15px;
            border-left: 5px solid var(--color-organizer);
            display: flex; justify-content: space-between; align-items: center;
        }
        .restore-btn {
            background: var(--color-organizer); color: white;
            border: none; padding: 10px 18px;
            border-radius: 30px; cursor: pointer;
            font-weight: bold; font-family: inherit;
        }

        .player-list-item {
            display: flex; justify-content: space-between;
            align-items: center; padding: 10px;
            background: white; border-radius: 10px;
        }
        .player-list-item button {
            background: none; border: none;
            cursor: pointer; font-size: 1.2em; padding: 4px 8px;
        }
        .player-list-item button:disabled { opacity: 0.3; cursor: default; }

        .week-item {
            background: white; padding: 15px;
            border-radius: var(--radius-btn); margin-bottom: 10px;
            border-left: 5px solid var(--color-success);
        }
        .week-item-header { cursor: pointer; }
        .week-item h3 { color: var(--color-primary); margin-bottom: 6px; }
        .week-item p  { margin-bottom: 4px; font-size: 0.95em; }
        .week-breakdown {
            display: none; margin-top: 10px;
            background: #f8f9fa; padding: 10px;
            border-radius: 8px; font-size: 0.9em;
        }
        .week-breakdown div { padding: 3px 0; }
        .week-actions { display: flex; gap: 10px; margin-top: 10px; }
        .week-actions button {
            background: #f8f9fa; border: 1px solid #ddd;
            padding: 8px 16px; border-radius: 8px;
            cursor: pointer; font-family: inherit;
            font-size: 0.9em; font-weight: bold;
        }
        .week-actions button:hover { background: #e9ecef; }

        /* Toast z undo */
        #toast {
            position: fixed; bottom: 30px; left: 50%;
            transform: translateX(-50%);
            background: #333; color: white;
            padding: 0;
            border-radius: 16px;
            font-size: 1em; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 2000;
            opacity: 0; pointer-events: none;
            transition: opacity 0.25s;
            min-width: 260px; max-width: calc(100vw - 40px);
            overflow: hidden;
        }
        #toast.show { opacity: 1; pointer-events: auto; }
        .toast-body {
            display: flex; align-items: center;
            justify-content: space-between;
            padding: 14px 18px; gap: 12px;
        }
        .toast-msg { flex: 1; }
        .toast-undo-btn {
            background: rgba(255,255,255,0.18);
            border: 1px solid rgba(255,255,255,0.35);
            color: white; font-weight: 700;
            padding: 6px 14px; border-radius: 50px;
            cursor: pointer; font-size: 0.88em;
            font-family: inherit; white-space: nowrap;
            transition: background 0.15s; flex-shrink: 0;
        }
        .toast-undo-btn:hover { background: rgba(255,255,255,0.28); }
        .toast-progress-wrap { height: 3px; background: rgba(255,255,255,0.1); }
        .toast-progress-bar {
            height: 100%; background: rgba(255,255,255,0.5);
            transition: width linear;
        }
        #toast.no-undo .toast-body { padding: 14px 24px; }
        #toast.no-undo .toast-progress-wrap { display: none; }
        #toast.no-undo .toast-undo-btn { display: none; }

    </style>
</head>
<body>
    <div id="toast" role="status" aria-live="polite" aria-atomic="true">
        <div class="toast-body">
            <span class="toast-msg"></span>
            <button class="toast-undo-btn" id="toastUndoBtn" type="button">↩ Cofnij</button>
        </div>
        <div class="toast-progress-wrap">
            <div class="toast-progress-bar" id="toastProgressBar"></div>
        </div>
    </div>

    <div class="modal" id="resetModal"
         role="dialog"
         aria-modal="true"
         aria-labelledby="modalTitle"
         aria-describedby="modalDesc">
        <div class="modal-content">
            <h2 id="modalTitle">⚠️ UWAGA! Niebezpieczna operacja</h2>
            <p id="modalDesc">Aby wyczyścić WSZYSTKIE dane, wpisz hasło:</p>
            <input type="password" id="confirmResetInput"
                   placeholder="Wpisz hasło"
                   autocomplete="off"
                   aria-label="Hasło potwierdzające reset">
            <div class="modal-buttons">
                <button class="modal-btn cancel" id="cancelResetBtn">Anuluj</button>
                <button class="modal-btn confirm" id="confirmResetBtn">Usuń wszystko</button>
            </div>
        </div>
    </div>

    <div class="container">
        <header>
            <div class="header-main">
                <h1>🏓 Rozliczenia Tenis Stołowy</h1>
                <p>Zarządzaj płatnościami i śledź statystyki</p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button class="blik-header-info" id="blikCopy"
                            type="button"
                            aria-label="Skopiuj numer BLIK: 726 620 831">
                        <span>🔵 BLIK: 726 620 831</span>
                        <span class="blik-copy-hint" aria-hidden="true">📋 kliknij by skopiować</span>
                    </button>
                    <div class="sync-status-header" id="syncStatusHeader"
                         role="status" aria-live="polite">⏳ Łączenie...</div>
                </div>
            </div>
        </header>

        <nav role="tablist" aria-label="Nawigacja aplikacji">
            <button class="tab-btn active" role="tab" aria-selected="true"
                    aria-controls="dashboard" id="tab-dashboard" data-tab="dashboard">📊 Dashboard</button>
            <button class="tab-btn" role="tab" aria-selected="false"
                    aria-controls="halloffame" id="tab-halloffame" data-tab="halloffame">🏆 Hall of Fame</button>
            <button class="tab-btn" role="tab" aria-selected="false"
                    aria-controls="admin" id="tab-admin" data-tab="admin">⚙️ Panel Admina</button>
            <button class="tab-btn" role="tab" aria-selected="false"
                    aria-controls="months" id="tab-months" data-tab="months">📆 Miesiące</button>
            <button class="tab-btn" role="tab" aria-selected="false"
                    aria-controls="history" id="tab-history" data-tab="history">📅 Historia</button>
            <button class="tab-btn" role="tab" aria-selected="false"
                    aria-controls="players" id="tab-players" data-tab="players">👥 Gracze</button>
        </nav>

        <main class="content">

            <!-- Dashboard -->
            <div id="dashboard" class="tab-content active" role="tabpanel" aria-labelledby="tab-dashboard">
                <div class="summary-cards">
                    <div class="summary-card danger">
                        <div class="summary-label">Do zebrania</div>
                        <div class="summary-value" id="totalDebt" aria-live="polite">0 zł</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">Tygodni</div>
                        <div class="summary-value" id="activeWeeks" aria-live="polite">0</div>
                    </div>
                    <div class="summary-card success">
                        <div class="summary-label">Rozliczonych</div>
                        <div class="summary-value" id="paidPlayers" aria-live="polite">0/0</div>
                    </div>
                </div>

                <div class="dashboard-header">
                    <h2>👥 Ranking obecności</h2>
                    <label class="filter-toggle" id="debtFilterToggle">
                        <input type="checkbox" id="debtFilterCheckbox" aria-label="Pokaż tylko graczy z długiem">
                        <span>💰 Tylko zadłużeni</span>
                    </label>
                </div>

                <div id="playersGrid" class="dashboard-grid" aria-live="polite"></div>

                <div class="rank-legend">
                    <h3>🏆 Rangi (% obecności):</h3>
                    <div class="rank-legend-grid" role="list">
                        <div class="rank-legend-item" role="listitem"><span class="rank-legend-emoji" aria-hidden="true">🏆</span> LEGENDA 90%+</div>
                        <div class="rank-legend-item" role="listitem"><span class="rank-legend-emoji" aria-hidden="true">⭐</span> Mistrz 75%+</div>
                        <div class="rank-legend-item" role="listitem"><span class="rank-legend-emoji" aria-hidden="true">🔥</span> Stały 50%+</div>
                        <div class="rank-legend-item" role="listitem"><span class="rank-legend-emoji" aria-hidden="true">👀</span> Gość 25%+</div>
                        <div class="rank-legend-item" role="listitem"><span class="rank-legend-emoji" aria-hidden="true">👻</span> Duch &lt;25%</div>
                    </div>
                </div>
            </div>

            <!-- Admin -->
            <div id="admin" class="tab-content" role="tabpanel" aria-labelledby="tab-admin">
                <div class="admin-section">
                    <div class="edit-mode-banner" id="editModeBanner" role="alert">
                        ✏️ TRYB EDYCJI — edytujesz istniejący tydzień
                    </div>
                    <h2>➕ Dodaj nowy tydzień</h2>
                    <form id="weekForm" novalidate>
                        <input type="hidden" id="editWeekId">
                        <div class="form-group">
                            <label for="weekDate">📅 Data grania</label>
                            <input type="date" id="weekDate" name="weekDate" required aria-required="true">
                        </div>
                        <div class="form-group">
                            <label for="weekCost">💰 Koszt stołów (zł)</label>
                            <input type="number" id="weekCost" name="weekCost" step="0.01" min="0" required aria-required="true">
                            <div class="cost-presets" role="group" aria-label="Szybki wybór kosztu">
                                <button type="button" class="preset-btn" data-cost="0">0 zł</button>
                                <button type="button" class="preset-btn" data-cost="15">15 zł</button>
                                <button type="button" class="preset-btn" data-cost="30">30 zł</button>
                                <button type="button" class="preset-btn" data-cost="45">45 zł</button>
                                <button type="button" class="preset-btn" data-cost="60">60 zł</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>✅ Kto był obecny?</label>
                            <div class="checkbox-group" id="presentPlayers"
                                 role="group" aria-label="Wybierz obecnych graczy"></div>
                        </div>
                        <div class="form-group">
                            <label>🏃 Kto miał Multisport w tym tygodniu?</label>
                            <div class="checkbox-group" id="weekMultiPlayers"
                                 role="group" aria-label="Wybierz graczy z Multisport"></div>
                        </div>
                        <button type="submit" class="submit-btn" id="submitBtn">💾 Zapisz tydzień</button>
                        <button type="button" class="cancel-btn" id="cancelEditBtn"
                                style="display: none;" aria-label="Anuluj edycję tygodnia">❌ Anuluj edycję</button>
                    </form>
                </div>

                <div class="admin-section">
                    <h2>🏃 Domyślne Multi</h2>
                    <div class="checkbox-group" id="defaultMultiCheckboxes"
                         role="group" aria-label="Gracze z domyślnym Multisport"></div>
                </div>

                <div class="admin-section">
                    <h2>⚠️ Zarządzanie danymi</h2>
                    <button id="resetAllBtn" type="button"
                            style="background: #c0392b; color: white; padding: 16px; border: none; border-radius: 12px; cursor: pointer; width: 100%; font-weight: bold; font-size: 1em; font-family: inherit;"
                            aria-label="Wyczyść wszystkie dane (wymaga hasła)">
                        🗑️ Wyczyść wszystkie dane
                    </button>
                </div>
            </div>

            <!-- Miesiące -->
            <div id="months" class="tab-content" role="tabpanel" aria-labelledby="tab-months">
                <div class="monthly-summary">
                    <h2>📆 Zestawienie miesięczne — frekwencja</h2>
                    <div id="monthlySummary"></div>
                </div>
            </div>

            <!-- Hall of Fame -->
            <div id="halloffame" class="tab-content" role="tabpanel" aria-labelledby="tab-halloffame">
                <div class="admin-section">
                    <h2>🏆 Hall of Fame</h2>
                    <p class="hof-subtitle">Kto gra najregularniej w tym sezonie?</p>
                    <div class="chart-toggle-btns" role="group" aria-label="Typ wykresu">
                        <button class="chart-toggle active" data-hof-type="radar" type="button">🕸️ Radar</button>
                        <button class="chart-toggle" data-hof-type="bar" type="button">📊 Słupki</button>
                        <button class="chart-toggle" data-hof-type="doughnut" type="button">🍩 Kółko</button>
                    </div>
                    <div id="hofContent"></div>
                </div>
            </div>

            <!-- Historia -->
            <div id="history" class="tab-content" role="tabpanel" aria-labelledby="tab-history">
                <div class="admin-section">
                    <h2>📅 Historia tygodni</h2>
                    <div id="weeksList"></div>
                </div>
            </div>

            <!-- Gracze -->
            <div id="players" class="tab-content" role="tabpanel" aria-labelledby="tab-players">
                <div class="admin-section">
                    <h2>➕ Dodaj gracza</h2>
                    <form id="addPlayerForm" novalidate>
                        <div class="form-group">
                            <label for="newPlayerName">Imię gracza</label>
                            <input type="text" id="newPlayerName" name="newPlayerName"
                                   placeholder="Wpisz imię" required aria-required="true" maxlength="50">
                        </div>
                        <button type="submit" class="submit-btn">✅ Dodaj</button>
                    </form>
                </div>

                <div class="trash-section" id="trashSection" style="display: none;" role="alert">
                    <span>🗑️ Ostatnio usunięty: <strong id="lastDeletedName"></strong></span>
                    <button class="restore-btn" id="restorePlayerBtn">↩️ Przywróć</button>
                </div>

                <div class="admin-section">
                    <h2>👥 Lista graczy</h2>
                    <div id="playersList" style="display: grid; gap: 5px;"
                         role="list" aria-label="Lista graczy"></div>
                </div>
            </div>

        </main>
    </div>

    <script>
        function esc(str) {
            const d = document.createElement('div');
            d.textContent = String(str);
            return d.innerHTML;
        }

        const RESET_PASSWORD_HASH = '3676067a69b915c35168c04d0e7131bcb1ccc388ad05f030c80aa3a93d8cc58b';

        async function hashString(str) {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
            return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
        }

        async function verifyResetPassword(input) {
            return (await hashString(input)) === RESET_PASSWORD_HASH;
        }

        const firebaseConfig = {
            apiKey:            "AIzaSyA0aSm_EoDVibcu46IRL3xaFSskApWYrMo",
            authDomain:        "tenis-rozliczenia.firebaseapp.com",
            databaseURL:       "https://tenis-rozliczenia-default-rtdb.europe-west1.firebasedatabase.app",
            projectId:         "tenis-rozliczenia",
            storageBucket:     "tenis-rozliczenia.firebasestorage.app",
            messagingSenderId: "897063845076",
            appId:             "1:897063845076:web:76aa13cf2ef1759a654f41"
        };

        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();
        const dataRef  = database.ref('appData');

        let appData = {
            players:            ['Kamil', 'Krzysztof', 'Mariusz', 'Przemek', 'Arek', 'Rafał'],
            organizerName:      'Kamil',
            weeks:              [],
            paidUntilWeek:      {},
            defaultMultiPlayers: []
        };

        function getPlayers() { return appData.players ?? []; }

        let lastDeletedPlayer = null;
        let editingWeekId     = null;
        let showOnlyDebt      = false;
        let modalOpener       = null;
        let toastTimer        = null;
        let lastPayAction     = null;
        let undoTimer         = null;
        const UNDO_DURATION   = 10000;

        function showToast(msg, withUndo = false) {
            const toast = document.getElementById('toast');
            const msgEl = toast.querySelector('.toast-msg');
            const bar   = document.getElementById('toastProgressBar');

            msgEl.textContent = msg;
            toast.classList.toggle('no-undo', !withUndo);
            toast.classList.add('show');

            clearTimeout(toastTimer);
            clearTimeout(undoTimer);

            if (withUndo) {
                bar.style.transition = 'none';
                bar.style.width = '100%';
                bar.offsetWidth;
                bar.style.transition = `width ${UNDO_DURATION}ms linear`;
                bar.style.width = '0%';
                undoTimer = setTimeout(() => {
                    toast.classList.remove('show');
                    lastPayAction = null;
                }, UNDO_DURATION);
            } else {
                toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
            }
        }

        function hideToast() {
            document.getElementById('toast').classList.remove('show');
            clearTimeout(undoTimer);
            lastPayAction = null;
        }

        document.getElementById('toastUndoBtn').addEventListener('click', () => {
            if (!lastPayAction) return;
            const { player, previousValue } = lastPayAction;
            if (previousValue === null) {
                delete appData.paidUntilWeek[player];
            } else {
                appData.paidUntilWeek[player] = previousValue;
            }
            saveData();
            hideToast();
            showToast(`↩ Cofnięto — ${player} znów ma dług`);
        });

        function exportBackup() {
            const dataStr = JSON.stringify(appData, null, 2);
            const blob    = new Blob([dataStr], { type: 'application/json' });
            const url     = URL.createObjectURL(blob);
            const a       = document.createElement('a');
            a.href        = url;
            a.download    = `backup-tenis-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        database.ref('.info/connected').on('value', (snap) => {
            const el = document.getElementById('syncStatusHeader');
            if (snap.val()) {
                el.textContent = '✅ Online';
                el.className = 'sync-status-header connected';
            } else {
                el.textContent = '❌ Offline';
                el.className = 'sync-status-header disconnected';
            }
        });

        function loadData() {
            dataRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    appData = data;
                    if (!appData.players)             appData.players             = [];
                    if (!appData.weeks)               appData.weeks               = [];
                    if (!appData.defaultMultiPlayers) appData.defaultMultiPlayers = [];
                    if (!appData.paidUntilWeek)       appData.paidUntilWeek       = {};
                }
                renderAll();
            });
        }

        function saveData() { dataRef.set(appData); }

        function getRank(player, joinedAt = 0) {
            const relevantWeeks = appData.weeks.slice(joinedAt);
            if (relevantWeeks.length === 0) return { emoji: '❓', name: 'Nowy', weight: 0 };
            const presence = relevantWeeks.filter(w => w.present?.includes(player)).length;
            const pct      = presence / relevantWeeks.length;
            if (pct >= 0.9)  return { emoji: '🏆', name: 'LEGENDA', weight: 5 };
            if (pct >= 0.75) return { emoji: '⭐',  name: 'Mistrz',  weight: 4 };
            if (pct >= 0.5)  return { emoji: '🔥', name: 'Stały',   weight: 3 };
            if (pct >= 0.25) return { emoji: '👀', name: 'Gość',    weight: 2 };
            return { emoji: '👻', name: 'Duch', weight: 1 };
        }

        function calculateDebt(player) {
            if (player === appData.organizerName) return 0;
            let debt = 0;
            const paidIdx = appData.paidUntilWeek?.[player]
                ? appData.weeks.findIndex(w => w.id === appData.paidUntilWeek[player])
                : -1;
            appData.weeks.forEach((week, idx) => {
                if (idx <= paidIdx)                           return;
                if (!week.present?.includes(player))          return;
                if (week.multiPlayers?.includes(player))      return;
                const payers = week.present.filter(p => !week.multiPlayers?.includes(p)).length;
                if (payers > 0) debt += week.cost / payers;
            });
            return debt;
        }

        function buildDebtCache() {
            const cache = {};
            getPlayers().forEach(p => { cache[p] = calculateDebt(p); });
            return cache;
        }

        function renderAll() {
            renderDashboard();
            renderAdminCheckboxes();
            renderHistory();
            renderMonthlySummary();
            renderHallOfFame();
            renderPlayers();
            renderTrash();
            if (!document.getElementById('weekDate').value) {
                document.getElementById('weekDate').valueAsDate = new Date();
            }
        }

        function renderDashboard() {
            const grid = document.getElementById('playersGrid');
            const debtCache = buildDebtCache();

            let players = [...getPlayers()];
            if (showOnlyDebt) {
                players = players.filter(p => p !== appData.organizerName && debtCache[p] > 0);
            }

            players.sort((a, b) => {
                const rA = getRank(a, appData.playerJoinWeek?.[a] ?? 0);
                const rB = getRank(b, appData.playerJoinWeek?.[b] ?? 0);
                if (rB.weight !== rA.weight) return rB.weight - rA.weight;
                return a.localeCompare(b, 'pl');
            });

            let totalDebt = 0, paidCount = 0;
            let html = '';

            players.forEach(player => {
                const debt          = debtCache[player];
                const joinedAt      = appData.playerJoinWeek?.[player] ?? 0;
                const relevantWeeks = appData.weeks.slice(joinedAt);
                const presence      = relevantWeeks.filter(w => w.present?.includes(player)).length;
                const pct           = relevantWeeks.length ? (presence / relevantWeeks.length * 100) : 0;
                const rank          = getRank(player, joinedAt);
                const isOrganizer   = player === appData.organizerName;
                const hasMulti      = appData.weeks.length
                    ? appData.weeks[appData.weeks.length - 1].multiPlayers?.includes(player)
                    : appData.defaultMultiPlayers.includes(player);

                if (!isOrganizer) {
                    totalDebt += debt;
                    if (debt === 0) paidCount++;
                }

                const safeName  = esc(player);
                const safeRank  = esc(`${rank.emoji} ${rank.name}`);
                const cardClass = isOrganizer ? 'organizer' : (debt > 0 ? 'debt' : (hasMulti ? 'multi' : 'paid'));
                const initial   = esc(player.charAt(0).toUpperCase());
                const debtFixed = debt.toFixed(2);

                html += `
                <article class="player-card ${cardClass}" aria-label="Gracz ${safeName}">
                    <div class="rank-badge" aria-label="Ranga: ${safeRank}">${safeRank}</div>
                    <div class="player-header">
                        <div class="avatar" aria-hidden="true">${initial}</div>
                        <div class="player-name">${safeName}${isOrganizer ? ' 👑' : ''}</div>
                    </div>
                    <div class="attendance-text">Obecność: ${presence}/${relevantWeeks.length} (${pct.toFixed(0)}%)</div>
                    <div class="attendance-bar-container"
                         role="progressbar"
                         aria-valuenow="${pct.toFixed(0)}"
                         aria-valuemin="0" aria-valuemax="100"
                         aria-label="Frekwencja ${pct.toFixed(0)}%">
                        <div class="attendance-bar-fill" style="width: ${pct}%"></div>
                    </div>
                    ${!isOrganizer ? `
                        <div class="player-debt"
                             data-debt="${esc(debtFixed)}"
                             role="button" tabindex="0"
                             aria-label="Dług ${safeName}: ${esc(debtFixed)} zł. Kliknij by skopiować.">
                            ${esc(debtFixed)} zł
                            <span class="copy-hint" aria-hidden="true">kliknij by skopiować</span>
                        </div>
                        <button class="details-btn"
                                data-player="${safeName}"
                                aria-expanded="false"
                                aria-controls="details-${safeName}">
                            📋 Szczegóły zaległości
                        </button>
                        <div id="details-${safeName}"
                             style="display: none; background: rgba(0,0,0,0.1); border-radius: 10px; padding: 10px; margin: 10px 0;"
                             aria-live="polite"></div>
                        <button class="pay-btn ${debt === 0 ? 'paid-btn' : ''}"
                                data-player="${safeName}"
                                ${debt === 0 ? 'disabled aria-disabled="true"' : ''}
                                aria-label="${debt > 0 ? `Oznacz ${safeName} jako opłaconego` : `${safeName} jest już rozliczony`}">
                            ${debt > 0 ? '💸 Oznacz jako opłacone' : '✅ Rozliczony'}
                        </button>
                    ` : '<div class="player-debt" aria-label="Skarbnik">Skarbnik 👑</div>'}
                </article>`;
            });

            grid.innerHTML = html;
            document.getElementById('totalDebt').textContent  = `${totalDebt.toFixed(2)} zł`;
            document.getElementById('activeWeeks').textContent = appData.weeks.length;
            document.getElementById('paidPlayers').textContent = `${paidCount} / ${getPlayers().length - 1}`;
        }

        function renderAdminCheckboxes() {
            const configs = [
                { id: 'presentPlayers',        prefix: 'present',  defaultChecked: true,  isMulti: false },
                { id: 'weekMultiPlayers',       prefix: 'weekmulti',defaultChecked: false, isMulti: true  },
                { id: 'defaultMultiCheckboxes', prefix: 'defmulti', defaultChecked: false, isMulti: false }
            ];

            configs.forEach(({ id, prefix, defaultChecked }) => {
                const container = document.getElementById(id);
                if (!container) return;

                container.innerHTML = getPlayers().map(player => {
                    const checkId    = `${prefix}-${esc(player)}`;
                    const isDefault  = id === 'defaultMultiCheckboxes' && appData.defaultMultiPlayers.includes(player);
                    const isMultiDef = id === 'weekMultiPlayers'       && appData.defaultMultiPlayers.includes(player);
                    const checked    = defaultChecked || isDefault || isMultiDef;
                    const cls        = isMultiDef ? 'checkbox-item multi-item' : 'checkbox-item';

                    let cbClass = '';
                    if (id === 'presentPlayers')  cbClass = 'present-check';
                    if (id === 'weekMultiPlayers') cbClass = 'multi-check';

                    return `
                    <div class="${cls}">
                        <input type="checkbox" id="${checkId}" class="${cbClass}"
                               value="${esc(player)}" ${checked ? 'checked' : ''}>
                        <label for="${checkId}">${esc(player)}</label>
                    </div>`;
                }).join('');
            });
        }

        let freqChartInstance = null;
        let freqChartType = 'bar';

        function renderFreqChart() {
            const canvas = document.getElementById('freqChart');
            if (!canvas || typeof Chart === 'undefined') return;
            const players = getPlayers();
            const weeks   = appData.weeks;
            if (!weeks.length) { canvas.closest('.freq-chart-canvas-wrap').style.display = 'none'; return; }
            canvas.closest('.freq-chart-canvas-wrap').style.display = 'block';

            const counts = players.map(p => {
                const joinedAt = appData.playerJoinWeek?.[p] ?? 0;
                return weeks.slice(joinedAt).filter(w => w.present?.includes(p)).length;
            });
            const sorted   = [...counts].sort((a, b) => b - a);
            const maxCount = sorted[0] || 1;
            const PALETTE  = ['#ffd700','#667eea','#51cf66','#e91e8c','#74b9ff','#f39c12'];
            const colors   = players.map((_, i) => PALETTE[i % PALETTE.length]);

            if (freqChartInstance && freqChartInstance.config.type !== freqChartType) {
                freqChartInstance.destroy(); freqChartInstance = null;
            }
            const isRadar = freqChartType === 'radar';
            const data = isRadar ? {
                labels: players.map(p => esc(p)),
                datasets: [{ label: 'Wizyty', data: counts, backgroundColor: 'rgba(102,126,234,0.15)', borderColor: '#667eea', borderWidth: 2.5, pointBackgroundColor: colors, pointRadius: 5 }]
            } : {
                labels: players.map(p => esc(p)),
                datasets: [{ label: 'Wizyty', data: counts, backgroundColor: colors, borderColor: colors.map(c => c + 'cc'), borderWidth: 2, borderRadius: 10, borderSkipped: false }]
            };
            const tooltipLabel = ctx => {
                const v = isRadar ? ctx.parsed.r : ctx.parsed.y;
                return ` ${v} wizyt${v === maxCount ? ' 🏆' : ''}`;
            };
            const options = isRadar ? {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: tooltipLabel } } },
                scales: { r: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, pointLabels: { font: { size: 12, weight: 'bold' } }, grid: { color: 'rgba(0,0,0,0.08)' } } }
            } : {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: tooltipLabel } } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 13, weight: 'bold' } } },
                    y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Liczba wizyt', font: { size: 11 }, color: '#888' } }
                }
            };
            if (freqChartInstance) {
                freqChartInstance.data = data; freqChartInstance.options = options; freqChartInstance.update('active');
            } else {
                freqChartInstance = new Chart(canvas, { type: freqChartType, data, options });
            }
        }

        let hofDonutInstance = null;
        let hofChartType = 'radar';
        const HOF_COLORS = ['#00d2ff','#51cf66','#e91e8c','#ffd700','#a855f7','#f97316'];

        function renderHallOfFame() {
            const container = document.getElementById('hofContent');
            if (!container) return;
            const players = getPlayers();
            const weeks   = appData.weeks;

            if (!weeks.length) {
                container.innerHTML = '<div class="hof-empty">Dodaj pierwsze tygodnie żeby zobaczyć statystyki 📅</div>';
                return;
            }

            const stats = players.map((p, i) => {
                const joinedAt = appData.playerJoinWeek?.[p] ?? 0;
                const relevant = weeks.slice(joinedAt);
                const count    = relevant.filter(w => w.present?.includes(p)).length;
                const pct      = relevant.length ? Math.round(count / relevant.length * 100) : 0;
                return { name: p, count, pct, color: HOF_COLORS[i % HOF_COLORS.length] };
            }).sort((a, b) => b.count - a.count);

            const totalPresences = stats.reduce((s, p) => s + p.count, 0);
            const avgPerPerson   = players.length ? (totalPresences / players.length).toFixed(1) : 0;
            const overallPct     = weeks.length && players.length
                ? Math.round(totalPresences / (weeks.length * players.length) * 100) : 0;
            const leader = stats[0];

            // Podium z rankingiem olimpijskim (remisy = to samo miejsce)
            let currentRank = 0;
            let lastCount   = null;
            const ranked = stats.map(p => {
                if (p.count !== lastCount) { currentRank++; lastCount = p.count; }
                return { ...p, rank: currentRank };
            });
            const podiumPlayers = ranked.filter(p => p.rank <= 3);
            const medalMap = {
                1: { cls: 'first',  medal: '🥇' },
                2: { cls: 'second', medal: '🥈' },
                3: { cls: 'third',  medal: '🥉' }
            };
            const podiumHTML = podiumPlayers.map(p => {
                const { cls, medal } = medalMap[p.rank];
                return `
                <div class="hof-podium-slot ${cls}">
                    <div class="hof-avatar" style="background:${p.color}">${esc(p.name.charAt(0))}</div>
                    <div class="hof-podium-name">${esc(p.name)}</div>
                    <div class="hof-podium-count">${p.count} wizyt (${p.pct}%)</div>
                    <div class="hof-podium-bar">${medal}</div>
                </div>`;
            }).join('');

            const legendHTML = stats.map(p => `
                <div class="hof-legend-item">
                    <div class="hof-legend-dot" style="background:${p.color}"></div>
                    <span class="hof-legend-name">${esc(p.name)}</span>
                    <span class="hof-legend-val">${p.count} wizyt (${p.pct}%)</span>
                </div>`).join('');

            const statsHTML = `
                <div class="hof-stat-card"><div class="hof-stat-val">${totalPresences}</div><div class="hof-stat-label">Łącznie obecności</div></div>
                <div class="hof-stat-card"><div class="hof-stat-val magenta">${avgPerPerson}</div><div class="hof-stat-label">Średnio na osobę</div></div>
                <div class="hof-stat-card"><div class="hof-stat-val gold">${esc(leader.name)}</div><div class="hof-stat-label">🥇 Lider</div></div>
                <div class="hof-stat-card"><div class="hof-stat-val">${overallPct}%</div><div class="hof-stat-label">Ogólna frekwencja</div></div>`;

            const isDoughnut   = hofChartType === 'doughnut';
            const chartWrapHTML = isDoughnut ? `
                <div class="hof-chart-wrap" style="margin-bottom:20px;min-height:220px;">
                    <div style="position:relative;width:200px;height:200px;flex-shrink:0;">
                        <canvas id="hofMainChart" role="img" aria-label="Wykres kołowy" width="200" height="200"></canvas>
                        <div class="hof-donut-center">
                            <div class="hof-donut-center-num">${weeks.length}</div>
                            <div class="hof-donut-center-label">tygodni</div>
                        </div>
                    </div>
                    <div class="hof-legend">${legendHTML}</div>
                </div>` : `
                <div style="position:relative;width:100%;height:280px;margin-bottom:20px;">
                    <canvas id="hofMainChart" role="img" aria-label="Wykres frekwencji"></canvas>
                </div>
                <div class="hof-legend" style="flex-direction:row;flex-wrap:wrap;gap:12px;margin-bottom:16px;">${legendHTML}</div>`;

            container.innerHTML = `
                <div class="hof-podium">${podiumHTML}</div>
                ${chartWrapHTML}
                <div class="hof-stats">${statsHTML}</div>`;

            requestAnimationFrame(() => {
                const canvas = document.getElementById('hofMainChart');
                if (!canvas || typeof Chart === 'undefined') return;
                if (hofDonutInstance) { hofDonutInstance.destroy(); hofDonutInstance = null; }

                const counts = stats.map(p => p.count);
                const labels = stats.map(p => p.name);
                const colors = stats.map(p => p.color);

                let chartCfg;
                if (hofChartType === 'doughnut') {
                    chartCfg = {
                        type: 'doughnut',
                        data: { labels, datasets: [{ data: counts.map(c => c || 0.1), backgroundColor: colors, borderColor: 'transparent', borderWidth: 0, hoverOffset: 10 }] },
                        options: { responsive: false, animation: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${labels[ctx.dataIndex]}: ${counts[ctx.dataIndex]} wizyt (${stats[ctx.dataIndex].pct}%)` } } } }
                    };
                } else if (hofChartType === 'radar') {
                    chartCfg = {
                        type: 'radar',
                        data: { labels, datasets: [{ label: 'Wizyty', data: counts, backgroundColor: 'rgba(102,126,234,0.15)', borderColor: '#667eea', borderWidth: 2.5, pointBackgroundColor: colors, pointRadius: 5 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.r} wizyt` } } }, scales: { r: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, pointLabels: { font: { size: 12, weight: 'bold' } }, grid: { color: 'rgba(0,0,0,0.08)' } } } }
                    };
                } else {
                    chartCfg = {
                        type: 'bar',
                        data: { labels, datasets: [{ label: 'Wizyty', data: counts, backgroundColor: colors, borderColor: colors.map(c => c + 'cc'), borderWidth: 2, borderRadius: 10, borderSkipped: false }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} wizyt${ctx.parsed.y === Math.max(...counts) ? ' 🏆' : ''}` } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 13, weight: 'bold' } } }, y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Liczba wizyt', color: '#888', font: { size: 11 } } } } }
                    };
                }
                hofDonutInstance = new Chart(canvas, chartCfg);
            });
        }

        function renderMonthlySummary() {
            const container = document.getElementById('monthlySummary');
            if (!container) return;
            if (!appData.weeks.length) {
                container.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px;">Brak danych — dodaj pierwsze tygodnie 📅</p>';
                return;
            }
            const players = getPlayers();
            const byMonth = {};
            appData.weeks.forEach(week => {
                const key = week.date.slice(0, 7);
                if (!byMonth[key]) byMonth[key] = [];
                byMonth[key].push(week);
            });
            const months = Object.keys(byMonth).sort();
            let rows = '';
            months.forEach(monthKey => {
                const weeks = byMonth[monthKey];
                const [year, month] = monthKey.split('-');
                const monthName = new Date(+year, +month - 1, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
                rows += `<tr class="month-header"><td colspan="2">📅 ${esc(monthName)} — ${weeks.length} ${weeks.length === 1 ? 'tydzień' : weeks.length < 5 ? 'tygodnie' : 'tygodni'}</td></tr>`;
                players.forEach(player => {
                    const joinedAt   = appData.playerJoinWeek?.[player] ?? 0;
                    const activeWeeks = weeks.filter(w => appData.weeks.indexOf(w) >= joinedAt);
                    const present    = activeWeeks.filter(w => w.present?.includes(player)).length;
                    const total      = activeWeeks.length;
                    if (total === 0) {
                        rows += `<tr><td>${esc(player)}</td><td style="color:#ccc;font-size:0.8em;">dołączył później</td></tr>`;
                        return;
                    }
                    const pct   = Math.round(present / total * 100);
                    const emoji = pct === 100 ? '🔥' : pct >= 75 ? '😊' : pct >= 50 ? '😐' : '😴';
                    rows += `<tr>
                        <td>${esc(player)}</td>
                        <td>
                            <div class="monthly-bar-wrap">
                                <div class="monthly-bar-bg"><div class="monthly-bar-fill" style="width:${pct}%"></div></div>
                                <span class="monthly-pct">${pct}%</span>
                                <span>${emoji}</span>
                            </div>
                            <small style="color:#999">${present}/${total}</small>
                        </td>
                    </tr>`;
                });
            });
            container.innerHTML = `
                <table class="monthly-table" aria-label="Zestawienie miesięczne frekwencji">
                    <thead><tr><th>Gracz</th><th>Frekwencja</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;
        }

        function renderHistory() {
            const list = document.getElementById('weeksList');
            if (appData.weeks.length === 0) {
                list.innerHTML = '<p style="color:#999; text-align:center; padding: 20px;">Brak zapisanych tygodni.</p>';
                return;
            }
            list.innerHTML = [...appData.weeks].reverse().map(week => {
                const payers     = week.present.filter(p => !week.multiPlayers?.includes(p)).length;
                const perPerson  = payers ? (week.cost / payers).toFixed(2) : 0;
                const dateStr    = new Date(week.date + 'T12:00:00').toLocaleDateString('pl-PL');
                const safeId     = esc(week.id);
                const safeDateStr = esc(dateStr);
                const multiLine  = week.multiPlayers?.length ? `<p>🏃 Multi: ${esc(week.multiPlayers.join(', '))}</p>` : '';
                const breakdown  = week.present.map(p =>
                    `<div>${esc(p)}: ${week.multiPlayers?.includes(p) ? '0 zł (Multi)' : esc(perPerson) + ' zł'}</div>`
                ).join('');
                return `
                <div class="week-item">
                    <div class="week-item-header" role="button" tabindex="0"
                         aria-expanded="false" aria-controls="breakdown-${safeId}" data-week-toggle="${safeId}">
                        <h3>📅 ${safeDateStr}</h3>
                        <p>👥 ${esc(week.present.join(', '))}</p>
                        ${multiLine}
                        <p>💰 Koszt: ${esc(String(week.cost))} zł (${esc(perPerson)} zł/os) — kliknij by rozwinąć</p>
                    </div>
                    <div class="week-breakdown" id="breakdown-${safeId}" aria-live="polite">${breakdown}</div>
                    <div class="week-actions">
                        <button class="edit-week-btn" data-week-id="${safeId}" aria-label="Edytuj tydzień ${safeDateStr}">✏️ Edytuj</button>
                        <button class="delete-week-btn" data-week-id="${safeId}" aria-label="Usuń tydzień ${safeDateStr}">🗑️ Usuń</button>
                    </div>
                </div>`;
            }).join('');
        }

        function renderPlayers() {
            const list = document.getElementById('playersList');
            list.innerHTML = getPlayers().map(p => {
                const safeName    = esc(p);
                const isOrganizer = p === appData.organizerName;
                return `
                <div class="player-list-item" role="listitem">
                    <span>${safeName} ${isOrganizer ? '👑' : ''}</span>
                    <button class="delete-player-btn" data-player="${safeName}"
                            aria-label="Usuń gracza ${safeName}"
                            ${isOrganizer ? 'disabled aria-disabled="true"' : ''}>🗑️</button>
                </div>`;
            }).join('');
        }

        function renderTrash() {
            const trash = document.getElementById('trashSection');
            if (lastDeletedPlayer) {
                trash.style.display = 'flex';
                document.getElementById('lastDeletedName').textContent = lastDeletedPlayer;
            } else {
                trash.style.display = 'none';
            }
        }

        function editWeek(id) {
            const week = appData.weeks.find(w => w.id === id);
            if (!week) return;
            editingWeekId = id;
            document.getElementById('weekDate').value = week.date;
            document.getElementById('weekCost').value = week.cost;
            document.querySelectorAll('.present-check').forEach(cb => { cb.checked = week.present.includes(cb.value); });
            document.querySelectorAll('.multi-check').forEach(cb => { cb.checked = week.multiPlayers?.includes(cb.value) || false; });
            document.getElementById('editModeBanner').classList.add('active');
            document.getElementById('submitBtn').textContent = '💾 Aktualizuj tydzień';
            document.getElementById('submitBtn').classList.add('edit-mode');
            document.getElementById('cancelEditBtn').style.display = 'block';
            switchTab('admin');
        }

        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
            document.getElementById(tabId)?.classList.add('active');
            const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
            if (btn) { btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); }
        }

        function openModal() {
            modalOpener = document.activeElement;
            const modal = document.getElementById('resetModal');
            modal.classList.add('active');
            const input = document.getElementById('confirmResetInput');
            input.value = '';
            requestAnimationFrame(() => input.focus());
        }

        function closeModal() {
            document.getElementById('resetModal').classList.remove('active');
            if (modalOpener) { modalOpener.focus(); modalOpener = null; }
        }

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && document.getElementById('resetModal').classList.contains('active')) closeModal();
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function () { switchTab(this.dataset.tab); });
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                const el = e.target;
                if (el.classList.contains('player-debt') || el.dataset.weekToggle) { e.preventDefault(); el.click(); }
            }
        });

        document.addEventListener('click', async e => {

            if (e.target.closest('#blikCopy')) {
                navigator.clipboard.writeText('726620831')
                    .then(() => showToast('📋 Skopiowano numer BLIK'))
                    .catch(() => showToast('❌ Nie udało się skopiować'));
                return;
            }

            if (e.target.closest('#debtFilterToggle')) {
                showOnlyDebt = document.getElementById('debtFilterCheckbox').checked;
                document.getElementById('debtFilterToggle').classList.toggle('active', showOnlyDebt);
                renderDashboard();
                return;
            }

            if (e.target.closest('.player-debt')) {
                const debt = e.target.closest('.player-debt').dataset.debt;
                if (debt) {
                    navigator.clipboard.writeText(debt)
                        .then(() => showToast('📋 Skopiowano kwotę'))
                        .catch(() => showToast('❌ Nie udało się skopiować'));
                }
                return;
            }

            if (e.target.closest('.details-btn')) {
                const btn    = e.target.closest('.details-btn');
                const player = btn.dataset.player;
                const div    = document.getElementById(`details-${player}`);
                const isOpen = div.style.display !== 'none';
                btn.setAttribute('aria-expanded', String(!isOpen));
                if (isOpen) {
                    div.style.display = 'none';
                } else {
                    const paidIdx = appData.paidUntilWeek?.[player]
                        ? appData.weeks.findIndex(w => w.id === appData.paidUntilWeek[player]) : -1;
                    const details = appData.weeks.map((w, idx) => {
                        if (idx <= paidIdx) return null;
                        if (!w.present?.includes(player)) return null;
                        if (w.multiPlayers?.includes(player)) return null;
                        const payers = w.present.filter(p => !w.multiPlayers?.includes(p)).length;
                        if (!payers) return null;
                        return { date: w.date, amount: w.cost / payers };
                    }).filter(Boolean);
                    div.innerHTML = details.length
                        ? details.map(d => `<div>${esc(new Date(d.date + 'T12:00:00').toLocaleDateString('pl-PL'))}: ${esc(d.amount.toFixed(2))} zł</div>`).join('')
                        : '<em>Brak zaległości</em>';
                    div.style.display = 'block';
                }
                return;
            }

            if (e.target.closest('.pay-btn:not(.paid-btn)')) {
                const player = e.target.closest('.pay-btn').dataset.player;
                if (appData.weeks.length) {
                    lastPayAction = { player, previousValue: appData.paidUntilWeek[player] ?? null };
                    appData.paidUntilWeek[player] = appData.weeks[appData.weeks.length - 1].id;
                    saveData();
                    showToast(`✅ ${player} oznaczony jako opłacony`, true);
                }
                return;
            }

            if (e.target.closest('[data-week-toggle]')) {
                const header    = e.target.closest('[data-week-toggle]');
                const weekId    = header.dataset.weekToggle;
                const breakdown = document.getElementById(`breakdown-${weekId}`);
                if (!breakdown) return;
                const isOpen = breakdown.style.display !== 'none';
                breakdown.style.display = isOpen ? 'none' : 'block';
                header.setAttribute('aria-expanded', String(!isOpen));
                return;
            }

            if (e.target.closest('.edit-week-btn')) {
                editWeek(e.target.closest('.edit-week-btn').dataset.weekId);
                return;
            }

            if (e.target.closest('.delete-week-btn')) {
                const btn   = e.target.closest('.delete-week-btn');
                const id    = btn.dataset.weekId;
                const label = btn.getAttribute('aria-label') || 'ten tydzień';
                if (confirm(`Czy na pewno chcesz usunąć: ${label}?`)) {
                    appData.weeks = appData.weeks.filter(w => w.id !== id);
                    saveData();
                    showToast('🗑️ Usunięto tydzień');
                }
                return;
            }

            if (e.target.closest('.delete-player-btn')) {
                const btn    = e.target.closest('.delete-player-btn');
                const player = btn.dataset.player;
                if (player === appData.organizerName) return;
                if (confirm(`Usunąć gracza: ${player}?`)) {
                    lastDeletedPlayer = player;
                    appData.players   = appData.players.filter(x => x !== player);
                    saveData();
                    showToast(`🗑️ Usunięto ${player}`);
                }
                return;
            }

            if (e.target.closest('#restorePlayerBtn') && lastDeletedPlayer) {
                appData.players.push(lastDeletedPlayer);
                lastDeletedPlayer = null;
                saveData();
                showToast('✅ Przywrócono gracza');
                return;
            }

            if (e.target.closest('#resetAllBtn')) { openModal(); return; }
            if (e.target.closest('#cancelResetBtn')) { closeModal(); return; }

            if (e.target.closest('#confirmResetBtn')) {
                const input = document.getElementById('confirmResetInput').value;
                const valid = await verifyResetPassword(input);
                if (valid) {
                    exportBackup();
                    appData.weeks         = [];
                    appData.paidUntilWeek = {};
                    saveData();
                    closeModal();
                    showToast('✅ Dane wyczyszczone. Backup zapisany.');
                } else {
                    showToast('❌ Nieprawidłowe hasło');
                    document.getElementById('confirmResetInput').select();
                }
                return;
            }

            if (e.target.closest('.preset-btn')) {
                document.getElementById('weekCost').value = e.target.closest('.preset-btn').dataset.cost;
                return;
            }

            if (e.target.closest('.chart-toggle[data-chart-type]')) {
                const btn = e.target.closest('.chart-toggle');
                freqChartType = btn.dataset.chartType;
                document.querySelectorAll('.chart-toggle[data-chart-type]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderFreqChart();
                return;
            }

            if (e.target.closest('.chart-toggle[data-hof-type]')) {
                const btn = e.target.closest('.chart-toggle');
                hofChartType = btn.dataset.hofType;
                document.querySelectorAll('.chart-toggle[data-hof-type]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderHallOfFame();
                return;
            }

            if (e.target.closest('#cancelEditBtn')) {
                editingWeekId = null;
                document.getElementById('weekForm').reset();
                document.getElementById('weekDate').valueAsDate = new Date();
                document.getElementById('editModeBanner').classList.remove('active');
                document.getElementById('submitBtn').textContent = '💾 Zapisz tydzień';
                document.getElementById('submitBtn').classList.remove('edit-mode');
                document.getElementById('cancelEditBtn').style.display = 'none';
                renderAdminCheckboxes();
                return;
            }
        });

        document.getElementById('weekForm').addEventListener('submit', e => {
            e.preventDefault();
            const present = [...document.querySelectorAll('.present-check:checked')].map(cb => cb.value);
            const multi   = [...document.querySelectorAll('.multi-check:checked')].map(cb => cb.value);
            const week = {
                id:           editingWeekId || Date.now().toString(36),
                date:         document.getElementById('weekDate').value,
                cost:         parseFloat(document.getElementById('weekCost').value) || 0,
                present,
                multiPlayers: multi
            };
            if (editingWeekId) {
                const idx = appData.weeks.findIndex(w => w.id === editingWeekId);
                if (idx !== -1) appData.weeks[idx] = week;
                editingWeekId = null;
                document.getElementById('cancelEditBtn').click();
            } else {
                appData.weeks.push(week);
            }
            saveData();
            document.getElementById('weekForm').reset();
            document.getElementById('weekDate').valueAsDate = new Date();
            renderAdminCheckboxes();
            switchTab('dashboard');
            showToast('✅ Tydzień zapisany');
        });

        document.getElementById('addPlayerForm').addEventListener('submit', e => {
            e.preventDefault();
            const name = document.getElementById('newPlayerName').value.trim();
            if (!name) return;
            if (appData.players.includes(name)) { showToast('⚠️ Gracz o tym imieniu już istnieje'); return; }
            appData.players.push(name);
            if (!appData.playerJoinWeek) appData.playerJoinWeek = {};
            appData.playerJoinWeek[name] = appData.weeks.length;
            saveData();
            document.getElementById('newPlayerName').value = '';
            showToast(`✅ Dodano gracza: ${name}`);
        });

        document.addEventListener('change', e => {
            if (e.target.closest('#defaultMultiCheckboxes')) {
                appData.defaultMultiPlayers = [...document.querySelectorAll('#defaultMultiCheckboxes input:checked')].map(cb => cb.value);
                saveData();
            }
        });

        loadData();
    </script>
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('✅ SW zarejestrowany:', reg.scope))
                    .catch(err => console.error('❌ SW błąd:', err));
            });
        }
    </script>
</body>
</html>