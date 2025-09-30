// ==UserScript==
// @name         SAWORK
// @namespace    http://tampermonkey.net/
// @version      0.0.6
// @description  try to take over the world!
// @author       SLY w/ Contributions by niofox, SkyLove512, anthonyra, [AEP] Valkynen, Risingson, Swift42
// @match        https://*.based.staratlas.com/
// @require      https://raw.githubusercontent.com/androdes/slyworks/refs/heads/master/logger.js
// @require      https://raw.githubusercontent.com/androdes/slyworks/refs/heads/master/utils.js
// @require      https://raw.githubusercontent.com/androdes/slyworks/refs/heads/master/idl/cargoIDL.js
// @require      https://raw.githubusercontent.com/androdes/slyworks/refs/heads/master/idl/sageIDL.js
// @require      https://raw.githubusercontent.com/androdes/slyworks/refs/heads/master/idl/pontsIDL.js
// @require      https://raw.githubusercontent.com/androdes/slyworks/refs/heads/master/idl/craftingIDL.js
// @require      https://raw.githubusercontent.com/androdes/slyworks/refs/heads/master/idl/pointsStoreIDL.js
// @require      https://raw.githubusercontent.com/androdes/slyworks/refs/heads/master/idl/profileIDL.js
// @require      https://raw.githubusercontent.com/androdes/slyworks/refs/heads/master/idl/profileFactionIDL.js
// @require      https://unpkg.com/@solana/web3.js@1.95.8/lib/index.iife.min.js#sha256=a759deca1b65df140e8dda5ad8645c19579536bf822e5c0c7e4adb7793a5bd08
// @require      https://raw.githubusercontent.com/ImGroovin/SAGE-Lab-Assistant/main/anchor-browserified.js#sha256=f29ef75915bcf59221279f809eefc55074dbebf94cf16c968e783558e7ae3f0a
// @require      https://raw.githubusercontent.com/ImGroovin/SAGE-Lab-Assistant/main/buffer-browserified.js#sha256=4fa88e735f9f1fdbff85f4f92520e8874f2fec4e882b15633fad28a200693392
// @require      https://raw.githubusercontent.com/ImGroovin/SAGE-Lab-Assistant/main/bs58-browserified.js#sha256=87095371ec192e5a0e50c6576f327eb02532a7c29f1ed86700a2f8fb5018d947
// @require      https://raw.githubusercontent.com/androdes/slyworks/refs/heads/master/rpc-connection.manager.js
// @require      https://raw.githubusercontent.com/androdes/slyworks/refs/heads/master/sly-core.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=staratlas.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// ==/UserScript==

(async function () {
    'use strict';
    const slyModule = await sly;

    const uiCSS = `
    /* Styles pour le panneau de workflow */

    #workflow-panel {
        position: fixed;
        top: 5vh;
        left: 10vw;
        width: 80vw;
        max-width: 800px;
        height: 85vh;
        max-height: 85vh;
        background-color: rgba(25, 25, 25, 0.95);
        border: 1px solid rgba(75, 75, 75, 0.5);
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
        color: #f0f0f0;
        font-family: sans-serif;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    }

    #workflow-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(75, 75, 75, 0.5);
        padding: 10px 15px;
        padding-left: 60px;
        background-color: rgba(35, 35, 35, 0.8);
        border-radius: 10px 10px 0 0;
        cursor: move;
        flex-shrink: 0;
    }

    /* Titre du panneau */
    #workflow-header h2 {
        margin: 0;
        font-size: 1.2em;
        color: #e0e0e0;
        flex-grow: 1;
        text-align: center;
    }

    /* Bouton Back */
    #workflow-header #back-to-main-btn.back-link {
        position: absolute;
        top: 10px;
        left: 10px;
        background-color: #6c757d; /* Gris, similaire à prev-btn */
        color: white;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        transition: background-color 0.2s, color 0.2s;
        z-index: 1000;
        display: none !important; /* Forcer le masquage par défaut */
    }

    .stats-link {
        position: absolute;
        top: 10px;
        left: 10px;
        background-color: #6c757d; /* Gris, similaire à prev-btn */
        color: white;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        transition: background-color 0.2s, color 0.2s;
        z-index: 1000;
        display: none !important; /* Forcer le masquage par défaut */
    }

    #workflow-header #back-to-main-btn.back-link.visible {
        display: block !important; /* Afficher uniquement avec .visible */
    }

    #workflow-header #back-to-main-btn.back-link:hover {
        background-color: #5a6268;
        color: #fff;
    }

    #workflow-header #back-to-main-btn.back-link:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    #current-workflow li:last-child {
        margin-bottom: 0;
    }

    /* Bouton Close */
    #close-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background-color: #dc3545; /* Rouge, similaire à delete-btn */
        color: white;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        line-height: 1;
        font-family: sans-serif;
        transition: background-color 0.2s, color 0.2s;
        z-index: 1000;
    }

    #close-btn:hover {
        background-color: #c82333; /* Rouge plus foncé au survol */
        color: #fff;
    }

    #close-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .workflow-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 15px;
        scrollbar-width: thin;
        scrollbar-color: #555 #2c2c2c;
    }


    .workflow-content::-webkit-scrollbar {
        width: 8px;
    }

    .workflow-content::-webkit-scrollbar-track {
        background: #2c2c2c;
        border-radius: 4px;
    }

    .workflow-content::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 4px;
    }

    .workflow-content::-webkit-scrollbar-thumb:hover {
        background: #666;
    }



    /* Styles pour assistStatsContent */
    #assistStatsContent {
        width: 100%;
        padding: 10px;
        background-color: rgba(75, 75, 75, 0.2);
        border-radius: 8px;
        border: 1px solid rgba(75, 75, 75, 0.3);
    }

    /* Ligne de flotte */
    .assist-fleet-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        margin-bottom: 5px;
        background-color: rgba(75, 75, 75, 0.3);
        border-radius: 5px;
        font-size: 0.9em;
        transition: background-color 0.2s;
    }

    .assist-fleet-row:hover {
        background-color: rgba(75, 75, 75, 0.6);
    }

    .workflow-content::-webkit-scrollbar {
        width: 8px;
    }

    .workflow-content::-webkit-scrollbar-track {
        background: #2c2c2c;
        border-radius: 4px;
    }

    .workflow-content::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 4px;
    }

    .workflow-content::-webkit-scrollbar-thumb:hover {
        background: #666;
    }

    /* Sections du workflow */
    .workflow-section {
        margin-bottom: 20px;
    }

    /* Bouton Toggle */
    #toggle-button {
        position: fixed;
        top: 20px;
        left: 30%;
        z-index: 10000;
        background-color: #28a745;
        color: #fff;
        border: none;
        border-radius: 5px;
        padding: 10px 15px;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        font-family: sans-serif;
    }

    /* Modal de profil */
    #profileModal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10001;
        background-color: #2c2c2c;
        border: 1px solid #444;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        padding: 20px;
        display: none;
        color: #e0e0e0;
        font-family: sans-serif;
        text-align: center;
    }

    #profileDiv {
        margin-top: 15px;
    }

    #profileSelect {
        width: 100%;
        background-color: #333;
        color: #fff;
        border: 1px solid #555;
        padding: 5px;
        border-radius: 4px;
    }

    #closeBtn {
        float: right;
        cursor: pointer;
        font-size: 1.2em;
        color: #aaa;
    }

    #closeBtn:hover {
        color: #fff;
    }

    /* Boutons d'action */
    .action-btn {
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 5px;
        color: #fff;
        cursor: pointer;
        font-size: 1em;
        background-color: #28a745;
        transition: background-color 0.2s, transform 0.1s;
    }

    .action-btn:disabled {
        background-color: #555;
        cursor: not-allowed;
        opacity: 0.6;
        pointer-events: none;
    }

    .action-btn:not(:disabled):hover {
        background-color: #218838;
    }

    /* Boutons de navigation */
    .step-navigation {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin: 15px 0;
        padding: 10px;
        background-color: rgba(75, 75, 75, 0.2);
        border-radius: 8px;
        border: 1px solid rgba(75, 75, 75, 0.3);
    }

    .nav-btn {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        min-width: 80px;
        transition: background-color 0.2s;
        color: white;
    }

    .nav-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .prev-btn {
        background-color: #6c757d;
    }

    .prev-btn:hover:not(:disabled) {
        background-color: #5a6268;
    }

    .next-btn {
        background-color: #007bff;
    }

    .next-btn:hover:not(:disabled) {
        background-color: #0056b3;
    }

    .reset-btn {
        background-color: #dc3545;
    }

    .reset-btn:hover:not(:disabled) {
        background-color: #c82333;
    }

    /* Boutons de contrôle */
    .control-btn {
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8em;
        min-width: 50px;
        transition: background-color 0.2s;
    }

    .start-btn {
        background-color: #28a745;
        color: white;
    }

    .start-btn:hover {
        background-color: #218838;
    }

    .pause-btn {
        background-color: #ffc107;
        color: black;
    }

    .pause-btn:hover {
        background-color: #e0a800;
    }

    .stop-btn {
        background-color: #dc3545;
        color: white;
    }

    .stop-btn:hover {
        background-color: #c82333;
    }

    .control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Conteneur des ressources */
    .resupply-note {
        font-size: 0.9em;
        color: #aaa;
        margin-top: 10px;
        text-align: center;
    }

    .resupply-move-mode {
        width: 100%;
        background-color: #333;
        color: #fff;
        border: 1px solid #555;
        padding: 5px;
        border-radius: 4px;
    }

    .destination-container {
        margin-bottom: 15px;
        padding: 10px;
        background-color: rgba(40, 167, 69, 0.1);
        border: 1px solid rgba(40, 167, 69, 0.3);
        border-radius: 5px;
    }

    .destination-container label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: #28a745;
    }

    .delete-resupply-step-btn {
        background-color: #dc3545;
        border: none;
        color: white;
        padding: 4px 8px;
        font-size: 0.8em;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 10px;
    }

    /* Informations sur l'étape actuelle */
    .current-step-info {
        text-align: center;
        margin: 10px 0;
        padding: 8px;
        background-color: rgba(40, 167, 69, 0.2);
        border-radius: 6px;
        border: 1px solid rgba(40, 167, 69, 0.3);
        font-size: 0.9em;
    }

    /* Listes */
    ul {
        list-style: none;
        padding: 0;
        margin: 10px 0 0 0;
    }

    li {
        background-color: rgba(75, 75, 75, 0.3);
        padding: 8px;
        border-radius: 5px;
        margin-bottom: 5px;
        font-size: 0.9em;
        cursor: pointer;
        transition: background-color 0.2s;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    li:hover {
        background-color: rgba(75, 75, 75, 0.6);
    }

    .delete-step-btn {
        background-color: #dc3545;
        border: none;
        color: white;
        padding: 4px 8px;
        font-size: 0.8em;
        border-radius: 4px;
        cursor: pointer;
    }

    .delete-step-btn:hover {
        background-color: #c82333;
    }

    /* Grille de propriétés */
    .properties-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 10px;
    }

    .property-tile {
        flex: 1 1 calc(50% - 10px);
        min-width: 120px;
        background-color: #383838;
        border-radius: 8px;
        padding: 10px;
        text-align: center;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s;
    }

    .property-tile:hover {
        transform: translateY(-2px);
    }

    .property-tile strong {
        display: block;
        font-size: 0.8em;
        color: #999;
        margin-bottom: 5px;
    }

    .property-tile span {
        display: block;
        font-size: 1.1em;
        font-weight: bold;
        color: #f0f0f0;
    }

    /* Éléments de ravitaillement */
    .resupply-item {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
    }

    .resupply-item select,
    .resupply-item input {
        flex: 1;
    }

    .resupply-item .delete-resupply-item-btn {
        background-color: #dc3545;
        border: none;
        color: white;
        padding: 4px 8px;
        font-size: 0.8em;
        border-radius: 4px;
        cursor: pointer;
        line-height: 1;
        min-width: 30px;
    }

    /* Étapes éditables */
    .editable-step .step-content:hover {
        background-color: rgba(75, 75, 75, 0.8);
        border-radius: 3px;
    }

    .editable-step {
        cursor: pointer;
    }

    /* Contrôles globaux */
    .global-controls {
        margin-bottom: 15px;
        padding: 10px;
        background-color: rgba(75, 75, 75, 0.3);
        border-radius: 8px;
        border: 1px solid rgba(75, 75, 75, 0.5);
    }

    .global-controls h4 {
        margin: 0 0 10px 0;
        color: #e0e0e0;
        font-size: 1em;
    }

    .global-controls .workflow-controls {
        margin-top: 0;
        justify-content: center;
    }

    /* Conteneur flexible */
    .flex-container {
        display: flex;
        flex-wrap: nowrap;
        gap: 10px;
        align-items: flex-start;
    }

    /* Statut de la flotte */
    .fleet-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
    }

    .fleet-status {
        font-size: 0.9em;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: bold;
    }

    .status-stopped {
        background-color: #6c757d;
        color: white;
    }

    .status-running {
        background-color: #28a745;
        color: white;
    }

    .status-paused {
        background-color: #ffc107;
        color: black;
    }

    /* Balance */
    #assist-modal-balance {
        font-size: 0.9em;
        color: #ffd700;
        background-color: rgba(0, 0, 0, 0.3);
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid rgba(255, 215, 0, 0.3);
    }

    /* Champs de texte */
    .text-input {
        width: 100%;
        box-sizing: border-box;
        padding: 8px;
        margin-top: 10px;
        border: 1px solid #555;
        background-color: #333;
        color: #fff;
        border-radius: 5px;
        font-size: 0.9em;
    }

    /* Animation des étapes */
    .step-item {
        position: relative;
        opacity: 0.5;
        transform: scale(0.98);
        transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out, border 0.5s ease-in-out, box-shadow 0.5s ease-in-out;
        border: 1px solid transparent;
    }

    .step-item.active {
        opacity: 1;
        transform: scale(1);
        border: 1px solid #28a745;
        box-shadow: 0 0 10px rgba(40, 167, 69, 0.5);
        animation: pulsating 1.5s infinite ease-in-out;
    }

    .step-item.fade-out {
        opacity: 0;
        transform: scale(0.95);
        transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
    }

    @keyframes pulsating {
        0% {
            transform: scale(1);
            box-shadow: 0 0 10px rgba(40, 167, 69, 0.5);
        }
        50% {
            transform: scale(1.02);
            box-shadow: 0 0 20px rgba(40, 167, 69, 0.8);
        }
        100% {
            transform: scale(1);
            box-shadow: 0 0 10px rgba(40, 167, 69, 0.5);
        }
    }

    /* Styles pour assistStatsContent */
    #assistStatsContent {
        width: 100%;
        margin-top: 10px;
        padding: 10px;
        background-color: rgba(75, 75, 75, 0.2);
        border-radius: 8px;
        border: 1px solid rgba(75, 75, 75, 0.3);
    }

    /* Ligne de flotte */
    .assist-fleet-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        margin-bottom: 5px;
        background-color: rgba(75, 75, 75, 0.3);
        border-radius: 5px;
        font-size: 0.9em;
        transition: background-color 0.2s;
    }

    .assist-fleet-row:hover {
        background-color: rgba(75, 75, 75, 0.6);
    }

    /* Colonnes de la ligne de flotte */
    .fleet-label,
    .fleet-food,
    .fleet-status {
        flex: 1;
        text-align: center;
        color: #f0f0f0;
    }

    .fleet-status {
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
    }

    .fleet-status:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }

    /* Tooltip pour l'état */
    .fleet-status-tooltip {
        position: relative;
        display: inline-block;
    }

    .fleet-status-tooltip .tooltiptext {
        visibility: hidden;
        width: 200px;
        background-color: #2c2c2c;
        color: #e0e0e0;
        text-align: center;
        border-radius: 6px;
        padding: 8px;
        position: absolute;
        z-index: 10001;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        border: 1px solid #444;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        font-size: 0.8em;
        opacity: 0;
        transition: opacity 0.3s;
    }

    .fleet-status-tooltip:hover .tooltiptext {
        visibility: visible;
        opacity: 1;
    }

    /* Ajustements responsifs */
    @media (max-width: 768px) {
        #workflow-panel {
            top: 2vh;
            left: 2vw;
            width: 96vw;
            height: 94vh;
            overflow: auto;
        }

        .assist-fleet-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
        }

        .fleet-label,
        .fleet-food,
        .fleet-status {
            text-align: left;
            width: 100%;
        }
    }

    @media (max-height: 600px) {
        #workflow-panel {
            top: 1vh;
            height: 97vh;
        }
    }
        `;

    const uiHTML = `
        <button id="toggle-button">Manage Fleets</button>
    <div id="workflow-panel" style="display: none;">
        <div id="workflow-header">
            <span id="back-to-main-btn" class="back-link">&lt; Back</span>
            <div style="display: flex; flex-direction: column; align-items: center; flex-grow: 1;">
                <h2 id="panel-title">Fleet Workflow</h2>
                <div id="assist-modal-balance">SOL: 0.000 Atlas: 0</div>
               <span id="assist-stats-btn" class="stats-link">Stats</span>
            </div>
            <span id="close-btn">&times;</span>
        </div>

        <div class="workflow-content">

            <div id="main-view">
                <div class="workflow-section">
                    <button id="load-fleets" class="action-btn">Load Fleets</button>

                    <button id="crafting-btn" class="action-btn" disabled style="display: none;">Crafting</button>
                    <ul id="current-workflow"></ul>
                </div>
            </div>
            <div id="steps-view" style="display: none;">
                <div id="steps-properties" class="workflow-section">
                    <h3>Fleet Properties</h3>
                    <div id="properties-content"></div>
                </div>
                <div class="workflow-section">
                    <h3>Workflow Steps</h3>
                    <ul id="workflow-steps-list"></ul>
                    <button id="add-step-btn" class="action-btn">Add Step</button>
                </div>
            </div>
            <div id="add-step-options-view" style="display: none;">
                <div class="workflow-section">
                    <button id="resupply-btn" class="action-btn">Supply</button>
                </div>
                <div class="workflow-section">
                    <button id="move-btn" class="action-btn">Move</button>
                </div>
                <div class="workflow-section">
                    <button id="mine-btn" class="action-btn">Mine</button>
                </div>
            </div>
            <div id="ressuply-view" style="display: none;">
                <div class="workflow-section">
                    <h3>Supply</h3>
                    <div id="resupply-items-container"></div>
                    <button id="add-resupply-item-btn" class="action-btn" style="margin-top: 10px;">Add Resource</button>
                    <button id="save-resupply-btn" class="action-btn" style="margin-top: 20px;">Save Step</button>
                </div>
            </div>
            <div id="move-view" style="display: none;">
                <div class="workflow-section">
                    <h3>Move</h3>
                    <label for="move-type">Type:</label>
                    <select id="move-type" class="text-input">
                        <option value="warp">Warp</option>
                        <option value="subwarp">Subwarp</option>
                        <option value="warpsubwarp">Warp/Subwarp</option>
                        <option value="warp-subwarp-warp">Warp/Subwarp alternate</option>
                    </select>
                    <label for="move-destination">Destination:</label>
                    <select id="move-destination" class="text-input"></select>
                    <button id="save-move-btn" class="action-btn" style="margin-top: 20px;">Save Step</button>
                </div>
            </div>
            <div id="mine-view" style="display: none;">
                <div class="workflow-section">
                    <h3>Mine</h3>
                    <label for="mine-starbase">Starbase:</label>
                    <select id="mine-starbase" class="text-input"></select>
                    <label for="mine-resource">Resource:</label>
                    <select id="mine-resource" class="text-input">
                        <option value="rock">Rock</option>
                        <option value="ore">Ore</option>
                        <option value="ice">Ice</option>
                    </select>
                    <button id="save-mine-btn" class="action-btn" style="margin-top: 20px;">Save Step</button>
                </div>
            </div>
            <div id="crafting-view" style="display: none;">
                <div class="workflow-section">
                    <h3>Crafting Jobs</h3>
                    <label for="crafting-resource">Resource to Craft:</label>
                    <select id="crafting-resource" class="text-input">
                        <option value="food">Food</option>
                        <option value="fuel">Fuel</option>
                        <option value="ammo">Ammunition</option>
                        <option value="toolkit">Toolkit</option>
                    </select>
                    <label for="crafting-starbase">Starbase:</label>
                    <select id="crafting-starbase" class="text-input"></select>
                    <label for="crafting-amount">Amount:</label>
                    <input type="number" id="crafting-amount" class="text-input" value="1" min="1">
                    <label for="crafting-crew">Crew:</label>
                    <input type="number" id="crafting-crew" class="text-input" value="1" min="1">
                    <button id="add-crafting-job-btn" class="action-btn" style="margin-top: 20px;">Add Crafting Job</button>
                    <ul id="crafting-jobs-list"></ul>
                </div>
            </div>
        </div>
    </div>
    <div id="profileModal" style="display: none;">
        <h3>Select a Profile</h3>
        <div id="profileDiv"></div>
    </div>
    `;


    async function showStepsView(selectedFleet) {
        currentFleetLabel = selectedFleet.label;
        currentFleetKey = selectedFleet.publicKey.toBase58();
        updateView('steps-view');

        stepsPropertiesContent.innerHTML = `<h4>${selectedFleet.label}</h4><div class="properties-grid">
            <div class="property-tile"><strong>State</strong><span>${selectedFleet.state}</span></div>
            <div class="property-tile"><strong>Cargo</strong><span>${selectedFleet.cargoCapacity}</span></div>
            <div class="property-tile"><strong>Fuel</strong><span>${selectedFleet.fuelCnt}/${selectedFleet.fuelCapacity}</span></div>
            <div class="property-tile"><strong>Ammo</strong><span>${selectedFleet.ammoCnt}/${selectedFleet.ammoCapacity}</span></div>
        </div>`;

        await refreshWorkflowStepsList(); // Refresh steps to highlight current step
        // Ajouter les contrôles de navigation
        addStepNavigationControls();

        // Mettre à jour les informations de navigation
        setTimeout(() => {
            updateStepNavigationInfo();
        }, 100);
    }


    // Fonction pour afficher/masquer les contrôles globaux
    const globalControlsHTML = `
        <div class="global-controls">
            <h4>Global Workflow Controls</h4>
            <div class="workflow-controls">
                <button id="global-start-btn" class="control-btn start-btn">Start All</button>
                <button id="global-pause-btn" class="control-btn pause-btn">Pause All</button>
                <button id="global-stop-btn" class="control-btn stop-btn">Stop All</button>
            </div>
        </div>
    `;


    let editingStepIndex = -1;
    let currentFleetLabel = '';
    let currentFleetKey = '';


    // 1. Inject styles and interface
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = uiCSS;
    document.head.appendChild(styleSheet);
    document.body.insertAdjacentHTML('beforeend', uiHTML);

    // 2. Event handling and logic
    const toggleButton = document.getElementById('toggle-button');
    const panel = document.getElementById('workflow-panel');
    const closeBtn = document.getElementById('close-btn');
    const loadFleetsBtn = document.getElementById('load-fleets');
    const currentWorkflowList = document.getElementById('current-workflow');
    const header = document.getElementById('workflow-header');

    const mainView = document.getElementById('main-view');
    const stepsView = document.getElementById('steps-view');
    const addStepBtn = document.getElementById('add-step-btn');
    // Ajouter après la définition de backButton
    const backButton = document.getElementById('back-to-main-btn');

    // Surveillance des modifications du style ou des classes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                console.log(`Back button style changed: ${backButton.style.display}, computed display: ${window.getComputedStyle(backButton).display}`);
            }
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                console.log(`Back button classes changed: ${backButton.className}`);
            }
        });
    });


    observer.observe(backButton, {attributes: true});


    const panelTitle = document.getElementById('panel-title');
    const stepsPropertiesContent = document.getElementById('properties-content');
    const workflowStepsList = document.getElementById('workflow-steps-list');

    const addStepOptionsView = document.getElementById('add-step-options-view');
    const resupplyBtn = document.getElementById('resupply-btn');
    const moveBtn = document.getElementById('move-btn');
    const mineBtn = document.getElementById('mine-btn');

    const resupplyView = document.getElementById('ressuply-view');
    const resupplyType = document.getElementById('resupply-type');
    const resupplyResource = document.getElementById('resupply-resource');
    const resupplyAmount = document.getElementById('resupply-amount');
    const saveResupplyBtn = document.getElementById('save-resupply-btn');

    const moveView = document.getElementById('move-view');
    const moveType = document.getElementById('move-type');
    const moveDestination = document.getElementById('move-destination');
    const saveMoveBtn = document.getElementById('save-move-btn');

    const mineView = document.getElementById('mine-view');
    const mineStarbase = document.getElementById('mine-starbase');
    const mineResource = document.getElementById('mine-resource');
    const saveMineBtn = document.getElementById('save-mine-btn');
    const resupplyItemsContainer = document.getElementById('resupply-items-container');


    const addResupplyItemBtn = document.getElementById('add-resupply-item-btn');
    const mineItemsSelect = document.getElementById('mine-resource');


    const mainViewElement = document.getElementById('main-view');
    const loadFleetsButton = document.getElementById('load-fleets');
    loadFleetsButton.insertAdjacentHTML('afterend', globalControlsHTML);
    // Nouveaux éléments DOM pour le crafting
    const craftingBtn = document.getElementById('crafting-btn');
    const craftingView = document.getElementById('crafting-view');
    const craftingResource = document.getElementById('crafting-resource');
    const craftingStarbase = document.getElementById('crafting-starbase');
    const craftingAmount = document.getElementById('crafting-amount');
    const craftingCrew = document.getElementById('crafting-crew');
    const addCraftingJobBtn = document.getElementById('add-crafting-job-btn');
    const craftingJobsList = document.getElementById('crafting-jobs-list');


    let workflowStates = {}; // Stocke l'état de chaque workflow (stopped, running, paused)


    // Mise à jour de l'écouteur pour loadFleetsBtn
    loadFleetsBtn.addEventListener('click', async () => {
        if (!slyModule.isInitComplete()) {
            loadFleetsBtn.disabled = true;
            loadFleetsBtn.textContent = 'Loading fleets...';
            await slyModule.initUser();
            loadFleetsBtn.style.display = 'none';
            loadFleetsBtn.disabled = false;
            await updateWorkflowList();
            craftingBtn.style.display = 'block'; // Afficher le bouton Crafting
            craftingBtn.disabled = false; // Activer le bouton Crafting
            updateView('main-view');
            await startAssistant();

            return;
        }
        location.reload();
    });

    function addStepNavigationControls() {
        const stepsSection = document.querySelector('#steps-view .workflow-section h3');
        if (stepsSection && !document.querySelector('.step-navigation')) {
            const navigationHTML = `
                <div class="current-step-info" id="current-step-info">
                    Current Step: Loading...
                </div>
                <div class="step-navigation">
                    <button id="prev-step-btn" class="nav-btn prev-btn">← Previous</button>
                    <button id="reset-workflow-btn" class="nav-btn reset-btn">Reset to Step 1</button>
                    <button id="next-step-btn" class="nav-btn next-btn">Next →</button>
                </div>
            `;

            stepsSection.insertAdjacentHTML('afterend', navigationHTML);

            // Attacher les événements
            document.getElementById('prev-step-btn').addEventListener('click', () => changeWorkflowStep(-1));
            document.getElementById('next-step-btn').addEventListener('click', () => changeWorkflowStep(1));
            document.getElementById('reset-workflow-btn').addEventListener('click', resetWorkflowToStart);
        }
    }

    // Fonction pour changer l'étape actuelle du workflow
    async function changeWorkflowStep(direction) {
        if (!currentFleetKey) return;

        const workflowDataKey = `workflow_data_${currentFleetKey}`;
        const workflowKey = `workflow_${currentFleetKey}`;

        let workflowData = await GM.getValue(workflowDataKey, {
            currentStepIndex: 0,
            stepState: 'ready',
            lastStepTime: Date.now(),
            stepRetryCount: 0
        });

        const workflowSteps = await GM.getValue(workflowKey, []);

        if (workflowSteps.length === 0) {
            alert('Aucune étape de workflow trouvée');
            return;
        }

        // Calculer le nouvel index
        let newIndex = workflowData.currentStepIndex + direction;

        // S'assurer que l'index reste dans les limites
        if (newIndex < 0) newIndex = workflowSteps.length - 1;
        if (newIndex >= workflowSteps.length) newIndex = 0;

        // Mettre à jour les données
        workflowData.currentStepIndex = newIndex;
        workflowData.stepRetryCount = 0;
        workflowData.lastStepTime = Date.now();
        workflowData.stepState = 'ready';

        await GM.setValue(workflowDataKey, workflowData);

        // Trouver la flotte et la reconfigurer
        const fleet = slyModule.getUserFleets().find(f => f.publicKey.toBase58() === currentFleetKey);
        if (fleet) {
            // Nettoyer l'étape précédente
            await cleanupWorkflowStep(fleet);

            // Réinitialiser l'état de la flotte
            updateFleetState(fleet, 'Idle');
            fleet.stepConfigured = false;

            // Réinitialiser avec la nouvelle étape
            await initializeWorkflowForFleet(fleet, workflowSteps);

            logger.log(4, `Fleet ${fleet.label} moved to workflow step ${newIndex + 1}/${workflowSteps.length}`);
        }

        // Rafraîchir l'affichage
        await refreshWorkflowStepsList();
        await updateStepNavigationInfo();
    }

    // Fonction pour remettre le workflow au début
    async function resetWorkflowToStart() {
        if (!currentFleetKey) return;

        if (!confirm('Êtes-vous sûr de vouloir remettre le workflow à l\'étape 1 ?')) {
            return;
        }

        const workflowDataKey = `workflow_data_${currentFleetKey}`;
        const workflowKey = `workflow_${currentFleetKey}`;

        const workflowSteps = await GM.getValue(workflowKey, []);

        if (workflowSteps.length === 0) {
            alert('Aucune étape de workflow trouvée');
            return;
        }

        // Reset des données workflow
        const resetData = {
            currentStepIndex: 0,
            stepState: 'ready',
            lastStepTime: Date.now(),
            stepRetryCount: 0,
            workflowStartTime: Date.now()
        };

        await GM.setValue(workflowDataKey, resetData);

        // Trouver la flotte et la reconfigurer
        const fleet = slyModule.getUserFleets().find(f => f.publicKey.toBase58() === currentFleetKey);
        if (fleet) {
            // Nettoyer l'étape précédente
            await cleanupWorkflowStep(fleet);

            // Réinitialiser l'état de la flotte
            updateFleetState(fleet, 'Idle');
            fleet.stepConfigured = false;

            // Stopper le workflow temporairement
            await setWorkflowState(currentFleetKey, 'stopped');

            // Réinitialiser avec la première étape
            await initializeWorkflowForFleet(fleet, workflowSteps);

            logger.log(4, `Fleet ${fleet.label} workflow reset to step 1`);
            alert(`Workflow reset to step 1 for ${fleet.label}. Click Start to resume.`);
        }

        // Rafraîchir l'affichage
        await refreshWorkflowStepsList();
        await updateStepNavigationInfo();

        // Rafraîchir la liste principale pour mettre à jour les boutons
        await updateWorkflowList();
    }

    // Fonction pour mettre à jour les informations de navigation
    async function updateStepNavigationInfo() {
        if (!currentFleetKey) return;

        const workflowDataKey = `workflow_data_${currentFleetKey}`;
        const workflowKey = `workflow_${currentFleetKey}`;

        const workflowData = await GM.getValue(workflowDataKey, {currentStepIndex: 0});
        const workflowSteps = await GM.getValue(workflowKey, []);

        const currentStepInfo = document.getElementById('current-step-info');
        const prevBtn = document.getElementById('prev-step-btn');
        const nextBtn = document.getElementById('next-step-btn');

        if (currentStepInfo && workflowSteps.length > 0) {
            const stepNum = workflowData.currentStepIndex + 1;
            const totalSteps = workflowSteps.length;
            const currentStep = workflowSteps[workflowData.currentStepIndex];

            let stepDescription = 'Unknown';
            if (currentStep) {
                switch (currentStep.type) {
                    case 'resupply':
                        if (currentStep.items && currentStep.items.length > 0) {
                            stepDescription = `Supply (${currentStep.items.length} resources)`;
                        } else {
                            stepDescription = `Move to ${currentStep.destination} (${currentStep.moveMode})`;
                        }
                        break;
                    case 'mine':
                        stepDescription = `Mine ${currentStep.resource}`;
                        break;
                    case 'move':
                        stepDescription = `Move to ${currentStep.destination} (${currentStep.moveMode})`;
                        break;
                }
            }

            currentStepInfo.textContent = `Current Step: ${stepNum}/${totalSteps} - ${stepDescription}`;
        }

        // Activer/désactiver les boutons selon le contexte
        if (prevBtn && nextBtn) {
            prevBtn.disabled = workflowSteps.length <= 1;
            nextBtn.disabled = workflowSteps.length <= 1;
        }
    }


    function toggleGlobalControls(show) {
        let globalControls = document.querySelector('.global-controls');
        if (show && !globalControls) {
            // Créer et injecter les contrôles globaux
            const loadFleetsButton = document.getElementById('load-fleets');
            loadFleetsButton.insertAdjacentHTML('afterend', globalControlsHTML);
            //console.log('Global controls created');
            attachGlobalControlEvents();
        } else if (!show && globalControls) {
            globalControls.remove();
            console.log('Global controls removed');
        } else if (show && globalControls) {
            globalControls.style.display = 'block';
            //console.log('Global controls shown');
        }
    }

    async function getWorkflowState(fleetKey) {
        const stateKey = `workflow_state_${fleetKey}`;
        return await GM.getValue(stateKey, 'stopped');
    }

    // Fonction pour sauvegarder l'état d'un workflow
    async function setWorkflowState(fleetKey, state) {
        const stateKey = `workflow_state_${fleetKey}`;
        await GM.setValue(stateKey, state);
        workflowStates[fleetKey] = state;
    }

    // Fonction pour obtenir le texte de statut basé sur l'état
    function getStatusText(state, hasWorkflow) {
        if (!hasWorkflow) return 'No workflow';
        switch (state) {
            case 'running':
                return 'Running';
            case 'paused':
                return 'Paused';
            case 'stopped':
                return 'Stopped';
            default:
                return 'Stopped';
        }
    }

    // Fonction pour obtenir la classe CSS du statut
    function getStatusClass(state, hasWorkflow) {
        if (!hasWorkflow) return 'status-stopped';
        switch (state) {
            case 'running':
                return 'status-running';
            case 'paused':
                return 'status-paused';
            case 'stopped':
                return 'status-stopped';
            default:
                return 'status-stopped';
        }
    }


    function updateView(view) {
        console.log(`updateView called with view: ${view}`);

        mainView.style.display = 'none';
        stepsView.style.display = 'none';
        addStepOptionsView.style.display = 'none';
        resupplyView.style.display = 'none';
        moveView.style.display = 'none';
        mineView.style.display = 'none';
        craftingView.style.display = 'none';

        closeBtn.style.display = 'none';
        backButton.classList.remove('visible');

        if (view === 'main-view' || view === 'steps-view') {
            editingStepIndex = -1;
        }

        switch (view) {
            case 'main-view':
                mainView.style.display = 'block';
                closeBtn.style.display = 'block';
                panelTitle.textContent = 'Fleet Workflow';
                break;
            case 'steps-view':
                stepsView.style.display = 'block';
                backButton.classList.add('visible');
                panelTitle.textContent = `Workflow for ${currentFleetLabel}`;
                break;
            case 'add-step-options-view':
                addStepOptionsView.style.display = 'block';
                backButton.classList.add('visible');
                panelTitle.textContent = 'Choose Action';
                break;
            case 'resupply-view':
                resupplyView.style.display = 'block';
                backButton.classList.add('visible');
                panelTitle.textContent = 'Supply Step';
                break;
            case 'move-view':
                moveView.style.display = 'block';
                backButton.classList.add('visible');
                panelTitle.textContent = 'Move Step';
                break;
            case 'mine-view':
                mineView.style.display = 'block';
                backButton.classList.add('visible');
                panelTitle.textContent = 'Mine Step';
                break;
            case 'crafting-view':
                craftingView.style.display = 'block';
                backButton.classList.add('visible');
                panelTitle.textContent = 'Crafting Jobs';
                break;

        }

        console.log(`updateView completed with view: ${view}, backButton class: ${backButton.className}, computed display: ${window.getComputedStyle(backButton).display}`);
    }


    backButton.addEventListener('click', () => {
        console.log(`Back button clicked, current view: main=${mainView.style.display}, steps=${stepsView.style.display}, addStep=${addStepOptionsView.style.display}, resupply=${resupplyView.style.display}, move=${moveView.style.display}, mine=${mineView.style.display}, crafting=${craftingView.style.display}`);

        if (stepsView.style.display === 'block') {
            updateView('main-view');
        } else if (addStepOptionsView.style.display === 'block') {
            updateView('steps-view');
        } else if (resupplyView.style.display === 'block' || moveView.style.display === 'block' || mineView.style.display === 'block') {
            updateView('add-step-options-view');
        } else if (craftingView.style.display === 'block') {
            updateView('main-view'); // Return to main-view from crafting-view
        } else {
            console.warn('Back button clicked in unexpected view state');
            updateView('main-view'); // Fallback to main-view
        }
    });

    toggleButton.addEventListener('click', () => {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        toggleButton.textContent = isHidden ? 'Hide Workflows' : 'Manage Fleets';
        if (isHidden) {
            console.log(`Panel shown, updating workflow list at ${Date.now()}`);
            updateWorkflowList();
            updateView('main-view');
        }
    });

    async function debugFleetListDuplication() {
        console.log('=== DEBUG DUPLICATION ===');
        console.log('Fleets in slyModule.getUserFleets():', slyModule.getUserFleets().map(f => ({
            label: f.label,
            key: f.publicKey.toBase58(),
            state: f.state
        })));
        const items = currentWorkflowList.querySelectorAll('.workflow-item');
        items.forEach(item => {
            const fleetKey = item.dataset.fleetKey;
            const controls = item.querySelector('.workflow-controls');
            const pauseButtons = controls.querySelectorAll('.fleet-pause-btn');
            console.log(`Fleet ${fleetKey}: ${pauseButtons.length} pause buttons found`);
            if (pauseButtons.length > 1) {
                console.warn(`Duplicate pause buttons detected for fleet ${fleetKey}`);
                console.log('Control HTML:', controls.innerHTML);
            }
        });
        console.log('=== FIN DEBUG ===');
    }


    // Ajouter à window.workflowDebug
    window.workflowDebug = {
        changeStep: changeWorkflowStep,
        resetWorkflow: resetWorkflowToStart,
        emergencyReset: emergencyResetWorkflow,
        cleanupStep: cleanupWorkflowStep,
        debugDuplication: debugFleetListDuplication
    };

    closeBtn.addEventListener('click', () => {
        panel.style.display = 'none';
        toggleButton.textContent = 'Manage Fleets';
    });

    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - panel.getBoundingClientRect().left;
        offsetY = e.clientY - panel.getBoundingClientRect().top;
        panel.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panel.style.left = `${e.clientX - offsetX}px`;
        panel.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        panel.style.cursor = 'grab';
        document.body.style.userSelect = 'auto';
    });


    let isUpdatingWorkflowList = false;

    async function updateWorkflowList() {
        if (isUpdatingWorkflowList) {
            //console.log(`updateWorkflowList skipped due to ongoing update at ${Date.now()}`);
            return;
        }
        isUpdatingWorkflowList = true;
        //console.log(`updateWorkflowList started at ${Date.now()}`); // Log pour débogage

        try {
            currentWorkflowList.innerHTML = ''; // Vider complètement la liste

            // Vérifier si on a des flottes chargées
            const hasFleetsLoaded = slyModule.getUserFleets() && slyModule.getUserFleets().length > 0;

            // Afficher ou masquer les contrôles globaux selon la présence de flottes
            toggleGlobalControls(hasFleetsLoaded);

            if (hasFleetsLoaded) {
                const existingKeys = new Set(); // Garder une trace des clés de flotte
                //console.log('Fleets in slyModule.getUserFleets():', slyModule.getUserFleets().map(f => f.publicKey.toBase58()));
                for (const fleet of slyModule.getUserFleets()) {
                    const fleetKey = fleet.publicKey.toBase58();
                    if (existingKeys.has(fleetKey)) {
                        console.warn(`Duplicate fleet key detected: ${fleetKey}`);
                        continue; // Ignorer les doublons
                    }
                    existingKeys.add(fleetKey);

                    const workflowKey = `workflow_${fleet.publicKey}`;
                    const existingWorkflow = await GM.getValue(workflowKey, null);
                    const hasWorkflow = existingWorkflow && existingWorkflow.length > 0;
                    const state = await getWorkflowState(fleet.publicKey);

                    const listItem = document.createElement('li');
                    listItem.classList.add('workflow-item');
                    listItem.dataset.fleetLabel = fleet.label;
                    listItem.dataset.fleetKey = fleetKey;

                    const statusText = getStatusText(state, hasWorkflow);
                    const statusClass = getStatusClass(state, hasWorkflow);

                    // Générer le HTML avec une structure claire
                    listItem.innerHTML = `
                        <div class="fleet-info">
                            <strong>${fleet.label}</strong>
                            <span class="fleet-status ${statusClass}">${statusText}</span>
                            <span class="fleet-status">${fleet.state}</span>
                        </div>
                        <div class="workflow-controls" data-fleet-key="${fleetKey}">
                            <button class="control-btn start-btn fleet-start-btn"
                                    data-fleet-key="${fleetKey}"
                                    ${state === 'running' || !hasWorkflow ? 'disabled' : ''}>
                                Start
                            </button>
                            <button class="control-btn pause-btn fleet-pause-btn"
                                    data-fleet-key="${fleetKey}"
                                    ${state !== 'running' ? 'disabled' : ''}>
                                Pause
                            </button>
                            <button class="control-btn stop-btn fleet-stop-btn"
                                    data-fleet-key="${fleetKey}"
                                    ${state === 'stopped' || !hasWorkflow ? 'disabled' : ''}>
                                Stop
                            </button>
                        </div>
                    `;
                    currentWorkflowList.appendChild(listItem);
                }
            }
        } finally {
            currentWorkflowList.scrollTop = currentWorkflowList.scrollHeight;
            isUpdatingWorkflowList = false;
            console.log(`updateWorkflowList completed at ${Date.now()}`);
        }
    }

    currentWorkflowList.addEventListener('click', async (event) => {
        const clickedItem = event.target.closest('.workflow-item');
        if (!clickedItem) return;

        // Désactiver temporairement le bouton pour éviter les clics multiples
        const disableButton = (btn) => {
            if (!btn.disabled) {
                btn.disabled = true;
                setTimeout(() => {
                    btn.disabled = false;
                }, 1000); // Réactiver après 1 seconde
            }
        };

        // Gérer les boutons de contrôle individuel
        if (event.target.classList.contains('fleet-start-btn')) {
            const fleetKey = event.target.dataset.fleetKey;
            disableButton(event.target);
            console.log(`Start clicked for fleet: ${fleetKey} at ${Date.now()}`);
            await startWorkflow(fleetKey);
            await updateWorkflowList();
            return;
        }

        if (event.target.classList.contains('fleet-pause-btn')) {
            const fleetKey = event.target.dataset.fleetKey;
            disableButton(event.target);
            console.log(`Pause clicked for fleet: ${fleetKey} at ${Date.now()}`);
            await pauseWorkflow(fleetKey);
            await updateWorkflowList();
            return;
        }

        if (event.target.classList.contains('fleet-stop-btn')) {
            const fleetKey = event.target.dataset.fleetKey;
            disableButton(event.target);
            console.log(`Stop clicked for fleet: ${fleetKey} at ${Date.now()}`);
            await stopWorkflow(fleetKey);
            await updateWorkflowList();
            return;
        }

        // Comportement existant pour ouvrir les détails du workflow
        if (!event.target.classList.contains('control-btn')) {
            currentFleetLabel = clickedItem.dataset.fleetLabel;
            currentFleetKey = clickedItem.dataset.fleetKey;
            const selectedFleet = slyModule.getUserFleets().find(f => f.publicKey.toBase58() === currentFleetKey);
            await showStepsView(selectedFleet);
        }
    });

    // Fonction pour attacher les événements des contrôles globaux
    function attachGlobalControlEvents() {
        const globalStartBtn = document.getElementById('global-start-btn');
        const globalPauseBtn = document.getElementById('global-pause-btn');
        const globalStopBtn = document.getElementById('global-stop-btn');

        // Supprimer les anciens écouteurs avant d'en ajouter de nouveaux
        if (globalStartBtn) {
            globalStartBtn.replaceWith(globalStartBtn.cloneNode(true)); // Cloner pour supprimer les écouteurs
            const newStartBtn = document.getElementById('global-start-btn');
            newStartBtn.addEventListener('click', async () => {
                console.log('Global Start clicked');
                for (const fleet of slyModule.getUserFleets()) {
                    const workflowKey = `workflow_${fleet.publicKey}`;
                    const existingWorkflow = await GM.getValue(workflowKey, null);
                    const hasWorkflow = existingWorkflow && existingWorkflow.length > 0;
                    const state = await getWorkflowState(fleet.publicKey);

                    if (hasWorkflow && state !== 'running') {
                        await startWorkflow(fleet.publicKey);
                    }
                }
                await updateWorkflowList();
            });
        }

        if (globalPauseBtn) {
            globalPauseBtn.replaceWith(globalPauseBtn.cloneNode(true));
            const newPauseBtn = document.getElementById('global-pause-btn');
            newPauseBtn.addEventListener('click', async () => {
                console.log('Global Pause clicked');
                for (const fleet of slyModule.getUserFleets()) {
                    const state = await getWorkflowState(fleet.publicKey);
                    if (state === 'running') {
                        await pauseWorkflow(fleet.publicKey);
                    }
                }
                await updateWorkflowList();
            });
        }

        if (globalStopBtn) {
            globalStopBtn.replaceWith(globalStopBtn.cloneNode(true));
            const newStopBtn = document.getElementById('global-stop-btn');
            newStopBtn.addEventListener('click', async () => {
                console.log('Global Stop clicked');
                for (const fleet of slyModule.getUserFleets()) {
                    const state = await getWorkflowState(fleet.publicKey);
                    if (state !== 'stopped') {
                        await stopWorkflow(fleet.publicKey);
                    }
                }
                await updateWorkflowList();
            });
        }
    }

    // Gestion des contrôles globaux
    document.getElementById('global-start-btn').addEventListener('click', async () => {
        for (const fleet of slyModule.getUserFleets()) {
            const workflowKey = `workflow_${fleet.publicKey}`;
            const existingWorkflow = await GM.getValue(workflowKey, null);
            const hasWorkflow = existingWorkflow && existingWorkflow.length > 0;
            const state = await getWorkflowState(fleet.publicKey);

            if (hasWorkflow && state !== 'running') {
                await startWorkflow(fleet.publicKey);
            }
        }
        await updateWorkflowList();
    });

    document.getElementById('global-pause-btn').addEventListener('click', async () => {
        for (const fleet of slyModule.getUserFleets()) {
            const state = await getWorkflowState(fleet.publicKey);
            if (state === 'running') {
                await pauseWorkflow(fleet.publicKey);
            }
        }
        await updateWorkflowList();
    });

    document.getElementById('global-stop-btn').addEventListener('click', async () => {
        for (const fleet of slyModule.getUserFleets()) {
            const state = await getWorkflowState(fleet.publicKey);
            if (state !== 'stopped') {
                await stopWorkflow(fleet.publicKey);
            }
        }
        await updateWorkflowList();
    });

    async function startWorkflow(fleetKey) {
        logger.log(4, `Starting workflow for fleet: ${fleetKey}`);
        await setWorkflowState(fleetKey, 'running');

        // Démarrer directement cette flotte spécifique
        const fleetIndex = slyModule.getUserFleets().findIndex(f => f.publicKey.toBase58() === fleetKey);
        if (fleetIndex !== -1) {
            const workflowKey = `workflow_${fleetKey}`;
            const workflowSteps = await GM.getValue(workflowKey, []);

            if (workflowSteps.length > 0) {
                await initializeWorkflowForFleet(slyModule.getUserFleets()[fleetIndex], workflowSteps);

                setTimeout(() => {
                    startWorkflowFleet(fleetIndex);
                }, 1000);
            }
        }
    }

    async function pauseWorkflow(fleetKey) {
        console.log(`Pausing workflow for fleet: ${fleetKey} at ${Date.now()}`);
        await setWorkflowState(fleetKey, 'paused');

        const fleet = slyModule.getUserFleets().find(f => f.publicKey.toBase58() === fleetKey);
        if (fleet) {
            updateFleetState(fleet, 'Workflow Paused');
            console.log(`Fleet state updated to: ${fleet.state} at ${Date.now()}`);
        }
    }

    async function stopWorkflow(fleetKey) {
        logger.log(4, `Stopping workflow for fleet: ${fleetKey}`);
        await setWorkflowState(fleetKey, 'stopped');

        // Marquer la flotte comme arrêtée
        const fleet = slyModule.getUserFleets().find(f => f.publicKey.toBase58() === fleetKey);
        if (fleet) {
            updateFleetState(fleet, 'Workflow Stopped');
        }
    }


    async function refreshWorkflowStepsList() {
        const oldSteps = workflowStepsList.querySelectorAll('.step-item.active');
        oldSteps.forEach(step => {
            step.classList.add('fade-out');
            setTimeout(() => {
                step.classList.remove('active', 'fade-out');
            }, 500); // Match transition duration
        });

        workflowStepsList.innerHTML = '';
        const workflowKey = `workflow_${currentFleetKey}`;
        const steps = await GM.getValue(workflowKey, []);
        const workflowDataKey = `workflow_data_${currentFleetKey}`;
        const workflowData = await GM.getValue(workflowDataKey, {
            currentStepIndex: 0,
            stepState: 'ready',
            lastStepTime: 0,
            stepRetryCount: 0
        });
        const currentStepIndex = workflowData.currentStepIndex;

        if (steps && steps.length > 0) {
            steps.forEach((step, index) => {
                const stepItem = document.createElement('li');
                stepItem.classList.add('editable-step', 'step-item');
                if (index === currentStepIndex) {
                    stepItem.classList.add('active');
                }
                stepItem.dataset.stepIndex = index;

                let stepDetails = 'Unknown step';
                if (step.type === 'resupply') {
                    if (step.items && step.items.length > 0) {
                        const itemsDescription = step.items.map(item => {
                            const action = item.action === 'recharge' ? 'Load' : 'Unload';
                            return `${action} ${item.amount} ${item.resource}`;
                        }).join(', ');
                        stepDetails = `${itemsDescription} then go to ${step.items[0]?.destination} (${step.moveMode})`;
                    } else {
                        stepDetails = `Move to ${step.destination} (${step.moveMode})`;
                    }
                } else if (step.type === 'mine') {
                    stepDetails = `Mine: ${step.resource} at ${step.starbase}`;
                } else if (step.type === 'move') {
                    stepDetails = `Move: to ${step.destination} by ${step.moveMode}`;
                }

                stepItem.innerHTML = `
                    <span class="step-content" style="flex-grow: 1; cursor: pointer;">${stepDetails}</span>
                    <button class="delete-step-btn" data-index="${index}">X</button>
                `;
                workflowStepsList.appendChild(stepItem);
            });
        } else {
            const noStepsItem = document.createElement('li');
            noStepsItem.classList.add('step-item');
            noStepsItem.textContent = 'No steps for this workflow.';
            workflowStepsList.appendChild(noStepsItem);
        }
        // Mettre à jour les informations de navigation si elles existent
        if (document.getElementById('current-step-info')) {
            await updateStepNavigationInfo();
        }
    }

    async function emergencyResetWorkflow(fleetKey) {
        logger.log(4, `Emergency reset for fleet ${fleetKey}`);

        const fleet = slyModule.getUserFleets().find(f => f.publicKey.toBase58() === fleetKey);
        if (!fleet) return;

        // Stopper le workflow
        await setWorkflowState(fleetKey, 'stopped');

        // Nettoyer complètement
        await cleanupWorkflowStep(fleet);

        // Reset des données workflow
        const workflowDataKey = `workflow_data_${fleetKey}`;
        await GM.setValue(workflowDataKey, {
            currentStepIndex: 0,
            stepState: 'ready',
            lastStepTime: Date.now(),
            stepRetryCount: 0,
            workflowStartTime: Date.now()
        });

        // Reset de l'état de la flotte
        updateFleetState(fleet, 'Idle');

        logger.log(4, `Emergency reset completed for ${fleet.label}`);
    }

    // Exposer les fonctions pour utilisation en console de debug
    window.workflowDebug = {
        changeStep: changeWorkflowStep,
        resetWorkflow: resetWorkflowToStart,
        emergencyReset: emergencyResetWorkflow,
        cleanupStep: cleanupWorkflowStep
    };

    async function fixFleetCoordinates() {
        const fleetKey = 'BPxPAZWDzH6pJ9fqThbzt5TgDa7kTixBFuVdcLU5wcB4'; // Votre fleet key
        const fleet = slyModule.getUserFleets().find(f => f.publicKey.toBase58() === fleetKey);

        if (!fleet) {
            console.error('Fleet not found');
            return;
        }

        try {
            // Obtenir la position actuelle de la flotte
            let fleetAcctInfo = await slyModule.getAccountInfo(fleet.label, 'fix coordinates', fleet.publicKey);
            slyModule.updateFleetMiscStats(fleet, fleetAcctInfo);
            let [fleetState, coords] = slyModule.getFleetState(fleetAcctInfo, fleet);

            logger.log(4, `Fleet ${fleet.label} current position:`, coords);

            if (coords && coords.length >= 2) {
                const currentCoordsStr = `${coords[0]},${coords[1]}`;

                // Corriger les coordonnées dans slyModule.getUserFleets()
                fleet.destCoord = currentCoordsStr;
                fleet.starbaseCoord = currentCoordsStr;
                fleet.startingCoords = [coords[0], coords[1]];

                // Corriger dans les données sauvegardées
                let fleetSavedData = await GM.getValue(fleet.publicKey.toString(), '{}');
                let fleetParsedData = JSON.parse(fleetSavedData);

                fleetParsedData.dest = currentCoordsStr;
                fleetParsedData.starbase = currentCoordsStr;

                await GM.setValue(fleet.publicKey.toString(), JSON.stringify(fleetParsedData));

                logger.log(4, `Fixed coordinates for ${fleet.label}: ${currentCoordsStr}`);

                // Forcer la continuation du workflow
                await forceWorkflowContinuation(fleetKey);

            } else {
                console.error('Could not determine fleet coordinates');
            }

        } catch (error) {
            console.error('Error fixing coordinates:', error);
        }
    }

    // 2. Fonction pour forcer la continuation du workflow
    async function forceWorkflowContinuation(fleetKey) {
        logger.log(4, `Forcing workflow continuation for ${fleetKey}`);

        const fleet = slyModule.getUserFleets().find(f => f.publicKey.toBase58() === fleetKey);
        if (!fleet) return;

        // Nettoyer l'étape actuelle
        await cleanupWorkflowStep(fleet);

        // Avancer au step suivant
        await onWorkflowStepCompleted(fleetKey);
    }

    workflowStepsList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-step-btn')) {
            const index = event.target.dataset.index;
            const workflowKey = `workflow_${currentFleetKey}`;
            const steps = await GM.getValue(workflowKey, []);
            if (steps) {
                steps.splice(index, 1);
                await GM.setValue(workflowKey, steps);
                refreshWorkflowStepsList();
            }
        }
        // Nouveau : gestion du clic pour éditer
        else if (event.target.classList.contains('step-content') || event.target.classList.contains('editable-step')) {
            const stepItem = event.target.closest('.editable-step');
            if (stepItem) {
                const stepIndex = parseInt(stepItem.dataset.stepIndex);
                await editStep(stepIndex);
            }
        }
    });

    // Fonction pour éditer un step existant
    async function editStep(stepIndex) {
        editingStepIndex = stepIndex;
        const workflowKey = `workflow_${currentFleetKey}`;
        const steps = await GM.getValue(workflowKey, []);
        const step = steps[stepIndex];

        if (!step) return;

        // Charger la vue appropriée selon le type de step
        switch (step.type) {
            case 'resupply':
                editResupplyStep(step);
                break;
            case 'move':
                editMoveStep(step);
                break;
            case 'mine':
                editMineStep(step);
                break;
        }
    }

    function editResupplyStep(step) {
        updateView('resupply-view');
        resupplyItemsContainer.innerHTML = '';

        const destinationContainer = document.createElement('div');
        destinationContainer.classList.add('destination-container');
        destinationContainer.innerHTML = `
            <label>Destination:</label>
            <div style="display: flex; align-items: center; gap: 10px;">
                <select class="text-input resupply-destination"></select>
                <button class="delete-resupply-step-btn">X</button>
            </div>
            <label style="margin-top: 10px;">Move Mode après resupply:</label>
            <div style="display: flex; align-items: center; gap: 10px;">
                <select class="text-input resupply-move-mode">
                    <option value="warp">Warp</option>
                    <option value="subwarp">Subwarp</option>
                </select>
            </div>
            <div class="resupply-note">Note : Vous pouvez sauvegarder sans ajouter de ressources pour effectuer uniquement un déplacement.</div>
        `;

        const destinationSelect = destinationContainer.querySelector('.resupply-destination');
        const destination = step.destination || (step.items.length > 0 ? step.items[0].destination : '');
        destinationSelect.innerHTML = slyModule.getValidTargets().map(dest =>
            `<option value="${dest.name}" ${dest.name === destination ? 'selected' : ''}>${dest.name}</option>`
        ).join('');

        const moveModeSelect = destinationContainer.querySelector('.resupply-move-mode');
        moveModeSelect.value = step.moveMode || 'warp';

        const deleteStepBtn = destinationContainer.querySelector('.delete-resupply-step-btn');
        deleteStepBtn.addEventListener('click', () => {
            resupplyItemsContainer.innerHTML = '';
        });
        resupplyItemsContainer.appendChild(destinationContainer);

        if (step.items && step.items.length > 0) {
            step.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('resupply-item');
                itemDiv.innerHTML = `
                    <select class="text-input resupply-action">
                        <option value="recharge" ${item.action === 'recharge' ? 'selected' : ''}>Load</option>
                        <option value="discharge" ${item.action === 'discharge' ? 'selected' : ''}>Unload</option>
                    </select>
                    <select class="text-input resupply-resource"></select>
                    <input type="number" class="text-input resupply-amount" value="${item.amount}">
                    <button class="delete-resupply-item-btn">X</button>
                `;
                const resourceSelect = itemDiv.querySelector('.resupply-resource');
                resourceSelect.innerHTML = cargoItems.map(res =>
                    `<option value="${res.name}" ${res.name === item.resource ? 'selected' : ''}>${res.name}</option>`
                ).join('');
                const deleteBtn = itemDiv.querySelector('.delete-resupply-item-btn');
                deleteBtn.addEventListener('click', () => {
                    itemDiv.remove();
                    if (!resupplyItemsContainer.querySelector('.resupply-item')) {
                        // Ne pas vider destinationContainer
                    }
                });
                resupplyItemsContainer.appendChild(itemDiv);
            });
        }
    }

    function editMoveStep(step) {
        updateView('move-view');
        addMoveDestinations();

        // Sélectionner les valeurs existantes
        moveType.value = step.moveMode;
        moveDestination.value = step.destination;
    }

    function editMineStep(step) {
        updateView('mine-view');
        addMineTargets();
        addMineItem();

        // Sélectionner les valeurs existantes
        mineStarbase.value = step.starbase;
        mineResource.value = step.resource;
    }

    // Add Step button
    addStepBtn.addEventListener('click', () => {
        updateView('add-step-options-view');
    });

    // Action Selection Buttons
    resupplyBtn.addEventListener('click', () => {
        updateView('resupply-view');
    });

    function addMoveDestinations() {
        moveDestination.innerHTML = slyModule.getValidTargets().map(starbase => `<option value="${starbase.name}">${starbase.name}</option>`).join('');
    }

    moveBtn.addEventListener('click', () => {
        updateView('move-view');
        // Populate destinations
        addMoveDestinations();
    });


    mineBtn.addEventListener('click', () => {
        updateView('mine-view');
        // Populate starbases

        addMineTargets();
        addMineItem();
    });

    async function saveStep(stepData) {
        const workflowKey = `workflow_${currentFleetKey}`;
        const steps = await GM.getValue(workflowKey, []);

        if (editingStepIndex >= 0) {
            // Mode édition : remplacer le step existant
            steps[editingStepIndex] = stepData;
            editingStepIndex = -1; // Reset
        } else {
            // Mode création : ajouter un nouveau step
            steps.push(stepData);
        }

        await GM.setValue(workflowKey, steps);
        refreshWorkflowStepsList();
        updateView('steps-view');
    }

    function addResupplyItem() {
        let destinationContainer = resupplyItemsContainer.querySelector('.destination-container');
        if (!destinationContainer) {
            destinationContainer = document.createElement('div');
            destinationContainer.classList.add('destination-container');
            destinationContainer.innerHTML = `
                <label>Destination:</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <select class="text-input resupply-destination"></select>
                    <button class="delete-resupply-step-btn">X</button>
                </div>
                <label style="margin-top: 10px;">Move Mode après resupply:</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <select class="text-input resupply-move-mode">
                        <option value="warp">Warp</option>
                        <option value="subwarp">Subwarp</option>
                    </select>
                </div>
                <div class="resupply-note">Note : Vous pouvez sauvegarder sans ajouter de ressources pour effectuer uniquement un déplacement.</div>
            `;
            const destinationSelect = destinationContainer.querySelector('.resupply-destination');
            destinationSelect.innerHTML = slyModule.getValidTargets().map(destination =>
                `<option value="${destination.name}">${destination.name}</option>`
            ).join('');
            const moveModeSelect = destinationContainer.querySelector('.resupply-move-mode');
            moveModeSelect.value = 'warp'; // Défaut

            const deleteStepBtn = destinationContainer.querySelector('.delete-resupply-step-btn');
            deleteStepBtn.addEventListener('click', () => {
                resupplyItemsContainer.innerHTML = '';
            });
            resupplyItemsContainer.appendChild(destinationContainer);
        }

        const itemDiv = document.createElement('div');
        itemDiv.classList.add('resupply-item');
        itemDiv.innerHTML = `
            <select class="text-input resupply-action">
                <option value="recharge">Load</option>
                <option value="discharge">Unload</option>
            </select>
            <select class="text-input resupply-resource"></select>
            <input type="number" class="text-input resupply-amount" value="100">
            <button class="delete-resupply-item-btn">X</button>
        `;
        const resourceSelect = itemDiv.querySelector('.resupply-resource');
        resourceSelect.innerHTML = cargoItems.map(res =>
            `<option value="${res.name}">${res.name}</option>`
        ).join('');
        const deleteBtn = itemDiv.querySelector('.delete-resupply-item-btn');
        deleteBtn.addEventListener('click', () => {
            itemDiv.remove();
            if (!resupplyItemsContainer.querySelector('.resupply-item')) {
                // Ne pas vider destinationContainer pour permettre un move sans cargo
                // resupplyItemsContainer.innerHTML = '';
            }
        });
        resupplyItemsContainer.appendChild(itemDiv);
    }


    function addMineItem() {
        let assistResources = ['', 'Arco', 'Biomass', 'Carbon', 'Copper Ore', 'Diamond', 'Hydrogen', 'Iron Ore', 'Lumanite', 'Rochinol'];
        let optionsStr = '';
        assistResources.forEach(function (resource) {
            optionsStr += '<option value="' + resource + '">' + resource + '</option>';
        });
        mineItemsSelect.innerHTML = optionsStr;
    }

    function addMineTargets() {
        mineStarbase.innerHTML = slyModule.getValidTargets().map(starbase => `<option value="${starbase.name}">${starbase.name}</option>`).join('');
    }


    addResupplyItemBtn.addEventListener('click', addResupplyItem);

    saveResupplyBtn.addEventListener('click', () => {
        const items = [];
        const destinationEl = resupplyItemsContainer.querySelector('.resupply-destination');
        const moveModeEl = resupplyItemsContainer.querySelector('.resupply-move-mode');
        const itemElements = resupplyItemsContainer.querySelectorAll('.resupply-item');

        if (!destinationEl) {
            alert('Veuillez sélectionner une destination valide.');
            return;
        }

        const destination = destinationEl.value;
        const moveMode = moveModeEl ? moveModeEl.value : 'warp'; // Défaut 'warp'
        if (!destination) {
            alert('Veuillez sélectionner une destination valide.');
            return;
        }

        let isValid = true;
        itemElements.forEach(itemEl => {
            const action = itemEl.querySelector('.resupply-action').value;
            const resource = itemEl.querySelector('.resupply-resource').value;
            const amount = parseInt(itemEl.querySelector('.resupply-amount').value, 10);

            if (!action || !resource || isNaN(amount) || amount <= 0) {
                isValid = false;
                alert('Veuillez remplir tous les champs avec des valeurs valides pour chaque ressource.');
                return;
            }

            items.push({destination, action, resource, amount});
        });

        if (!isValid && itemElements.length > 0) {
            alert('Aucun élément de ravitaillement valide trouvé.');
            return;
        }

        items.sort((a, b) => {
            if (a.action === 'discharge' && b.action !== 'discharge') return -1;
            if (b.action === 'discharge' && a.action !== 'discharge') return 1;
            return 0;
        });

        const step = {
            type: 'resupply',
            items: items,
            moveMode: moveMode,
            destination: destination // Ajouter la destination explicitement
        };
        logger.log(4, `Saving step ${JSON.stringify(step)}`);
        saveStep(step);
    });

    // Appeler cette fonction pour afficher la vue de ravitaillement et y ajouter un premier élément
    resupplyBtn.addEventListener('click', () => {
        updateView('resupply-view');
        resupplyItemsContainer.innerHTML = '';
        addResupplyItem();
    });

    saveMoveBtn.addEventListener('click', () => {
        const step = {
            type: 'move',
            moveMode: moveType.value,
            destination: moveDestination.value
        };
        saveStep(step);
    });

    saveMineBtn.addEventListener('click', () => {
        const step = {
            type: 'mine',
            starbase: mineStarbase.value,
            resource: mineResource.value
        };
        saveStep(step);
    });

    async function workflowHealthCheck() {


        for (let i = 0, n = slyModule.getUserFleets().length; i < n; i++) {
            const fleet = slyModule.getUserFleets()[i];
            const workflowState = await getWorkflowState(fleet.publicKey);

            if (workflowState === 'running' && fleet.workflowData) {
                if (fleet.lastOp && Date.now() - fleet.lastOp > 900000) { // 15 minutes
                    console.warn(`Workflow ${fleet.label} semble bloqué - réinitialisation`);
                    await cleanupWorkflowStep(fleet);
                    await onWorkflowStepError(fleet.publicKey, 'Timeout santé workflow');
                }
            }
        }

        setTimeout(workflowHealthCheck, 60000);
    }

    let tokenCheckCounter;
    async function tokenCheck() {

        if ((tokenCheckCounter % 10) === 0) { // check token balance every 100 seconds
            logger.log(1, 'Checking SOL and Atlas balance');
            const solBalance = await solanaReadConnection.getBalance(userPublicKey);
            const atlasBalance = await solanaReadConnection.getParsedTokenAccountsByOwner(userPublicKey, {mint: new solanaWeb3.PublicKey('ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx')});
            document.getElementById('assist-modal-balance').innerHTML = 'SOL:' + ((solBalance / 1000000000).toFixed(3)) + ' Atlas:' + (atlasBalance.value[0] ? parseInt(atlasBalance.value[0].account.data.parsed.info.tokenAmount.uiAmount) : 0);
        }
        tokenCheckCounter++;

        setTimeout(tokenCheck, 10000);
    }

    // Mise à jour de startAssistant pour inclure les tâches de crafting
    // Mise à jour de startAssistant
    async function startAssistant() {
        for (let i = 0, n = slyModule.getUserFleets().length; i < n; i++) {
            slyModule.getUserFleets()[i].iterCnt = 0;
            const workflowKey = `workflow_${slyModule.getUserFleets()[i].publicKey}`;
            const workflowSteps = await GM.getValue(workflowKey, []);
            const workflowState = await getWorkflowState(slyModule.getUserFleets()[i].publicKey);

            if (workflowSteps.length > 0 && workflowState === 'running') {
                await initializeWorkflowForFleet(slyModule.getUserFleets()[i], workflowSteps);
                setTimeout(() => {
                    startWorkflowFleet(i);
                }, 1500 * (i + 1));
            } else {
                logger.log(4, `No workflow for ${slyModule.getUserFleets()[i].label}`);
            }
        }

        // Gestion des tâches de crafting
        const craftLabels = await GM.getValue('crafting_jobs', []);
        for (let i = 0; i < craftLabels.length; i++) {
            const label = craftLabels[i];
            let dataStr = await GM.getValue(label, '{}');
            let data = JSON.parse(dataStr);
            if (!data.state) {
                data.state = 'Idle';
                await GM.setValue(label, JSON.stringify(data));
            }
            setTimeout(() => {
                slyModule.startCraft(data);
            }, 2000 * (i + 1));
        }

        setTimeout(workflowHealthCheck, 5000);
        setTimeout(tokenCheck, 1000);
    }

    // Fonction pour initialiser une flotte en mode workflow
    async function initializeWorkflowForFleet(fleet, workflowSteps) {
        const workflowDataKey = `workflow_data_${fleet.publicKey}`;
        let workflowData = await GM.getValue(workflowDataKey, {
            currentStepIndex: 0,
            stepState: 'ready',
            lastStepTime: Date.now(),
            stepRetryCount: 0,
            workflowStartTime: Date.now()
        });

        // S'assurer que l'index ne dépasse pas le nombre d'étapes
        if (workflowData.currentStepIndex >= workflowSteps.length) {
            workflowData.currentStepIndex = 0; // Recommencer au début
        }

        const currentStep = workflowSteps[workflowData.currentStepIndex];

        // Attacher les données de workflow à la flotte pour accès facile
        fleet.workflowData = workflowData;
        fleet.currentWorkflowStep = currentStep;
        fleet.workflowSteps = workflowSteps;

        // Sauvegarder les données de workflow
        await GM.setValue(workflowDataKey, workflowData);

        logger.log(4, `Fleet ${fleet.label} initialized with workflow step ${workflowData.currentStepIndex}: ${currentStep.type}`);
    }

    // Nouvelle fonction pour démarrer une flotte en mode workflow
    async function startWorkflowFleet(fleetIndex) {
        let extraTime = 0;
        const fleet = slyModule.getUserFleets()[fleetIndex];
        if (fleet.iterCnt < 2) {
            fleet.assignment = 'Transport';
            GM.setValue(fleet.publicKey.toString(), JSON.stringify(fleet));
        }

        try {
            // Vérifier si le workflow est toujours actif
            const workflowState = await getWorkflowState(fleet.publicKey);
            if (workflowState !== 'running') {
                logger.log(4, `Workflow arrêté pour ${fleet.label}`);
                return;
            }

            if (fleet.workflowData && fleet.currentWorkflowStep) {
                fleet.fontColor = 'lightblue';
                let fleetAcctInfo = await slyModule.getAccountInfo(fleet.label, 'diagnostic', fleet.publicKey);
                slyModule.updateFleetMiscStats(fleet, fleetAcctInfo);
                let [fleetState, coords] = slyModule.getFleetState(fleetAcctInfo, fleet);

                // Configurer l'étape si pas encore fait
                if (!fleet.stepConfigured && fleetState !== 'StarbaseLoadingBay') {
                    logger.log(4, `Configuration étape ${fleet.currentWorkflowStep.type} pour ${fleet.label}`);
                    switch (fleet.currentWorkflowStep.type) {
                        case 'resupply':
                            await executeResupplyStep(fleet);
                            break;
                        case 'move':
                            await executeMoveStep(fleet);
                            break;
                        case 'mine':
                            await executeMineStep(fleet);
                            break;
                        default:
                            console.error(`Type d'étape inconnu: ${fleet.currentWorkflowStep.type}`);
                            await onWorkflowStepError(fleet.publicKey, `Type inconnu: ${fleet.currentWorkflowStep.type}`);
                            return;
                    }
                    fleet.stepConfigured = true;
                }

                // Appeler operateFleet qui va travailler avec la configuration
                await slyModule.operateFleet(fleetIndex);

                // Vérifier si l'étape est terminée
                if (await checkStepCompletion(fleetIndex)) {
                    logger.log(4, `Étape ${fleet.currentWorkflowStep.type} terminée pour ${fleet.label}`);
                    fleet.stepConfigured = false;
                    await cleanupWorkflowStep(fleet);
                    await onWorkflowStepCompleted(fleet.publicKey);
                    return;
                }

                fleet.fontColor = 'white';
            } else {
                logger.log(4, `Pas de données workflow pour ${fleet.label}`);
                return;
            }
        } catch (error) {
            extraTime = 20000;
            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Erreur workflow - attente 20s`, error);
            fleet.fontColor = 'crimson';
            slyModule.updateAssistStatus(fleet);
        }

        // Cycle continu
        setTimeout(() => {
            startWorkflowFleet(fleetIndex);
        }, 10000 + extraTime);
    }

    async function checkStepCompletion(fleetIndex) {
        const fleet = slyModule.getUserFleets()[fleetIndex];

        if (!fleet.currentWorkflowStep) return false;

        try {
            let fleetAcctInfo = await slyModule.slyModule.getAccountInfo(fleet.label, 'vérification workflow', fleet.publicKey);
            slyModule.updateFleetMiscStats(fleet, fleetAcctInfo);
            let [fleetState, extra] = slyModule.getFleetState(fleetAcctInfo, fleet);

            // Vérifier si la flotte est dans un état d'erreur
            if (fleetState.includes('ERROR')) {
                console.error(`Fleet ${fleet.label} est en erreur: ${fleetState}`);
                if (fleetState.includes('Fleet must start at Target or Starbase')) {
                    logger.log(4, `Tentative de correction des coordonnées pour ${fleet.label}`);
                    if (extra && extra.length >= 2) {
                        const currentCoordsStr = `${extra[0]},${extra[1]}`;
                        fleet.destCoord = currentCoordsStr;
                        fleet.starbaseCoord = currentCoordsStr;
                        fleet.startingCoords = [extra[0], extra[1]];
                        updateFleetState(fleet, 'Idle');
                        logger.log(4, `Coordonnées corrigées: ${currentCoordsStr}`);
                        return false;
                    }
                }
                return false;
            }

            switch (fleet.currentWorkflowStep.type) {
                case 'resupply':
                    const destinationName = fleet.currentWorkflowStep.destination || (fleet.currentWorkflowStep.items.length > 0 ? fleet.currentWorkflowStep.items[0].destination : null);
                    if (!destinationName) {
                        console.error(`Aucune destination définie pour l'étape resupply de ${fleet.label}`);
                        return false;
                    }
                    const destination = slyModule.getValidTargets().find(sb => sb.name === destinationName);
                    if (!destination) {
                        console.error(`Destination invalide '${destinationName}' pour ${fleet.label}`);
                        return false;
                    }
                    const dest = `${destination.x},${destination.y}`;
                    const [destX, destY] = ConvertCoords(dest);
                    const isAtDestination = fleetState === 'Idle' && extra && extra[0] === destX && extra[1] === destY;

                    if (isAtDestination) {
                        logger.log(4, `Step resupply terminé pour ${fleet.label} - déclenchement onWorkflowStepCompleted`);
                    }
                    return isAtDestination;

                case 'move':
                    const destinationMove = slyModule.getValidTargets().find(sb => sb.name === fleet.currentWorkflowStep.destination);
                    if (!destinationMove) {
                        console.error(`Destination invalide '${fleet.currentWorkflowStep.destination}' pour ${fleet.label}`);
                        return false;
                    }
                    const destMove = `${destinationMove.x},${destinationMove.y}`;
                    const [destMoveX, destMoveY] = ConvertCoords(destMove);
                    const isAtDestinationMove = fleetState === 'Idle' && extra && extra[0] === destMoveX && extra[1] === destMoveY;

                    if (isAtDestinationMove) {
                        logger.log(2, `Step move terminé pour ${fleet.label} - déclenchement onWorkflowStepCompleted`);
                    }
                    return isAtDestinationMove;

                case 'mine':
                    return fleetState === 'Idle' || (fleet.mineEnd && Date.now() >= fleet.mineEnd);

                default:
                    return true;
            }
        } catch (error) {
            console.error(`Erreur vérification completion ${fleet.label}:`, error);
            return false;
        }
    }

    async function cleanupWorkflowStep(fleet) {
        try {
            // Restaurer l'assignation originale
            if (fleet.workflowOriginalAssignment) {
                let fleetSavedData = await GM.getValue(fleet.publicKey.toString(), '{}');
                let fleetParsedData = JSON.parse(fleetSavedData);

                fleetParsedData.assignment = fleet.workflowOriginalAssignment;

                // Nettoyer TOUS les paramètres temporaires
                for (let i = 1; i <= 4; i++) {
                    delete fleetParsedData[`transportResource${i}`];
                    delete fleetParsedData[`transportResource${i}Perc`];
                    delete fleetParsedData[`transportResource${i}Crew`];
                    delete fleetParsedData[`transportSBResource${i}`];
                    delete fleetParsedData[`transportSBResource${i}Perc`];
                    delete fleetParsedData[`transportSBResource${i}Crew`];
                }
                delete fleetParsedData.mineResource;
                delete fleetParsedData.dest;
                delete fleetParsedData.starbase;
                delete fleetParsedData.moveType;


                await GM.setValue(fleet.publicKey.toString(), JSON.stringify(fleetParsedData));
            }

            // Nettoyer les propriétés de la flotte
            delete fleet.workflowDestination;
            delete fleet.workflowOriginalAssignment;
            delete fleet.isWorkflowMove;
            delete fleet.mineEnd;
            fleet.stepConfigured = false;
            fleet.resupplying = false;
            fleet.ressuplied = false;

            // Reset des targets
            fleet.moveTarget = '';
            fleet.destCoord = '';
            fleet.starbaseCoord = '';

            logger.log(4, `Cleaned up workflow step for ${fleet.label}`);

        } catch (error) {
            console.error(`Erreur nettoyage workflow:`, error);
        }
    }


    // Fonctions d'exécution des steps
    async function executeResupplyStep(fleet) {
        const step = fleet.currentWorkflowStep;
        logger.log(4, `Configuration ravitaillement pour ${fleet.label}:`, step);

        try {
            const fleetIndex = slyModule.getUserFleets().findIndex(f => f.publicKey.toBase58() === fleet.publicKey.toBase58());
            if (fleetIndex === -1) {
                throw new Error(`Flotte ${fleet.label} non trouvée`);
            }

            let fleetSavedData = await GM.getValue(fleet.publicKey.toString(), '{}');
            let fleetParsedData = JSON.parse(fleetSavedData);
            logger.log(4, `Resupplied: ${fleetSavedData.resupplied} moving: ${fleetSavedData.moving}`);

            if (!fleet.resupplied && !fleet.moving) {
                let fleetAcctInfo = await slyModule.getAccountInfo(fleet.label, 'diagnostic', fleet.publicKey);
                slyModule.updateFleetMiscStats(fleet, fleetAcctInfo);
                let [fleetState, coords] = slyModule.getFleetState(fleetAcctInfo, fleet);

                if (fleetState === 'Idle') {
                    fleet.workflowOriginalAssignment = fleetParsedData.assignment;
                    slyModule.getUserFleets()[fleetIndex].assignment = 'Transport';
                    slyModule.getUserFleets()[fleetIndex].loadCargo = [];
                    slyModule.getUserFleets()[fleetIndex].unloadCargo = [];

                    // Définir le moveType à partir de step.moveMode
                    let moveMode = step.moveMode || 'warp';
                    if (moveMode !== 'warp' && moveMode !== 'subwarp') {
                        console.warn(`Mode de déplacement invalide (${moveMode}) pour ${fleet.label}, défaut à 'warp'`);
                        moveMode = 'warp';
                    }
                    slyModule.getUserFleets()[fleetIndex].moveType = moveMode;
                    logger.log(4, `Move mode set ${slyModule.getUserFleets()[fleetIndex].moveType}`);

                    // Définir la destination
                    const destinationName = step.destination || (step.items.length > 0 ? step.items[0].destination : null);
                    if (!destinationName) {
                        throw new Error(`Aucune destination définie pour ${fleet.label}`);
                    }
                    const sbData = slyModule.getValidTargets().find(sb => sb.name === destinationName);
                    if (!sbData) {
                        throw new Error(`Destination invalide '${destinationName}' pour ${fleet.label}. Vérifiez slyModule.getValidTargets().`);
                    }
                    const targetDestination = `${sbData.x},${sbData.y}`;

                    const currentCoordsStr = `${coords[0]},${coords[1]}`;
                    const destCoordsStr = targetDestination;
                    const isAtStarbase = slyModule.getValidTargets().some(sb => `${sb.x},${sb.y}` === currentCoordsStr);
                    const isAtDestination = currentCoordsStr === destCoordsStr;
                    logger.log(4, `fleet is at destination: ${isAtDestination}, fleet is at starbase: ${isAtStarbase}`);

                    // Construire les manifestes si des items sont présents
                    const loadCargoManifest = [];
                    const unloadCargoManifest = [];
                    if (step.items && step.items.length > 0) {
                        step.items.forEach(item => {
                            const resourceToken = cargoItems.find(r => r.name === item.resource)?.token ||
                                (item.resource === 'Fuel' ? sageGameAcct.account.mints.fuel.toString() :
                                    item.resource === 'Ammunition' ? sageGameAcct.account.mints.ammo.toString() :
                                        item.resource === 'Food' ? sageGameAcct.account.mints.food.toString() :
                                            item.resource === 'Toolkit' ? sageGameAcct.account.mints.toolkit.toString() : null);

                            if (!resourceToken) {
                                console.warn(`Ressource ${item.resource} non trouvée, ignorée`);
                                return;
                            }

                            const cargoEntry = {res: resourceToken, amt: item.amount, crew: 0};

                            if (isAtStarbase) {
                                if (item.action === 'recharge') {
                                    loadCargoManifest.push(cargoEntry);
                                } else if (item.action === 'discharge') {
                                    unloadCargoManifest.push(cargoEntry);
                                }
                            } else if (isAtDestination) {
                                if (item.action === 'recharge') {
                                    unloadCargoManifest.push(cargoEntry);
                                } else if (item.action === 'discharge') {
                                    loadCargoManifest.push(cargoEntry);
                                }
                            }
                        });
                    } else {
                        logger.log(4, `Aucun item de ravitaillement pour ${fleet.label}, configuration pour déplacement uniquement`);
                    }

                    // Mettre à jour slyModule.getUserFleets()
                    slyModule.getUserFleets()[fleetIndex].starbaseCoord = currentCoordsStr;
                    slyModule.getUserFleets()[fleetIndex].destCoord = destCoordsStr;
                    slyModule.getUserFleets()[fleetIndex].startingCoords = [coords[0], coords[1]];
                    slyModule.getUserFleets()[fleetIndex].loadCargo = JSON.stringify(loadCargoManifest);
                    slyModule.getUserFleets()[fleetIndex].unloadCargo = JSON.stringify(unloadCargoManifest);

                    logger.log(4, `Ravitaillement configuré pour ${fleet.label}:`, {
                        starbase: fleetParsedData.starbase,
                        destination: fleetParsedData.dest,
                        loadCargo: loadCargoManifest,
                        unloadCargo: unloadCargoManifest,
                        moveType: moveMode,
                        isAtStarbase,
                        isAtDestination
                    });

                    await GM.setValue(fleet.publicKey.toString(), JSON.stringify(slyModule.getUserFleets()[fleetIndex]));
                    logger.log(4, `fleet save data ${await GM.getValue(fleet.publicKey.toString(), '{}')}`);
                }
            }

            if (fleet.resupplied && !fleet.moving) {
                logger.log(4, `Fleet ${fleet.label} Ready to move`);
            }
        } catch (error) {
            console.error(`Erreur config ravitaillement ${fleet.label}:`, error);
            await onWorkflowStepError(fleet.publicKey, error.message);
        }
    }


    async function executeMoveStep(fleet) {
        const step = fleet.currentWorkflowStep;
        logger.log(4, `Configuration ravitaillement pour ${fleet.label}:`, step.items);

        try {
            const fleetIndex = slyModule.getUserFleets().findIndex(f => f.publicKey.toBase58() === fleet.publicKey.toBase58());
            if (fleetIndex === -1) {
                throw new Error(`Flotte ${fleet.label} non trouvée`);
            }
            // Sauvegarder l'assignation actuelle
            let fleetSavedData = await GM.getValue(fleet.publicKey.toString(), '{}');
            let fleetParsedData = JSON.parse(fleetSavedData);
            logger.log(4, `Ressuplied : ${fleetSavedData.resupplied} moving : ${fleetSavedData.moving}`)
            if (!fleet.moving) {
                let fleetAcctInfo = await slyModule.getAccountInfo(fleet.label, 'diagnostic', fleet.publicKey);
                slyModule.updateFleetMiscStats(fleet, fleetAcctInfo);
                let [fleetState, coords] = slyModule.getFleetState(fleetAcctInfo, fleet);
                if (fleetState === 'Idle') {
                    fleet.workflowOriginalAssignment = fleetParsedData.assignment;
                    // Définir le moveType à partir de step.moveMode
                    let moveMode = step.moveMode || 'warp';
                    if (moveMode !== 'warp' && moveMode !== 'subwarp') {
                        console.warn(`Mode de déplacement invalide (${moveMode}) pour ${fleet.label}, défaut à 'warp'`);
                        moveMode = 'warp';
                    }
                    slyModule.getUserFleets()[fleetIndex].moveType = moveMode;
                    logger.log(4, `Move mode set ${slyModule.getUserFleets()[fleetIndex].moveType}`);

                    const destinationName = step.destination;
                    const sbData = slyModule.getslyModule.getValidTargets()().find(sb => sb.name === destinationName);
                    if (!sbData) {
                        throw new Error(`Destination invalide '${destinationName}' pour ${fleet.label}. Vérifiez slyModule.getValidTargets().`);
                    }
                    const targetDestination = `${sbData.x},${sbData.y}`;
                    const currentCoordsStr = `${coords[0]},${coords[1]}`;
                    const destCoordsStr = targetDestination;
                    const isAtStarbase = slyModule.getValidTargets().some(sb => `${sb.x},${sb.y}` === currentCoordsStr);
                    const isAtDestination = currentCoordsStr === destCoordsStr;
                    logger.log(4, `fleet is at destination: ${isAtDestination}, fleet is at starbase: ${isAtStarbase}`);


                    // Mettre à jour slyModule.getUserFleets()
                    slyModule.getUserFleets()[fleetIndex].starbaseCoord = currentCoordsStr;
                    slyModule.getUserFleets()[fleetIndex].destCoord = destCoordsStr;
                    slyModule.getUserFleets()[fleetIndex].startingCoords = [coords[0], coords[1]];

                    logger.log(4, `Movement configuré pour ${fleet.label}:`, {
                        starbase: fleetParsedData.starbase,
                        destination: fleetParsedData.dest,
                        moveType: moveMode,
                        isAtStarbase,
                        isAtDestination
                    });


                    await GM.setValue(fleet.publicKey.toString(), JSON.stringify(slyModule.getUserFleets()[fleetIndex]));

                    logger.log(4, `fleet save data ${await GM.getValue(fleet.publicKey.toString(), '{}')}`)
                }

            }


        } catch (error) {
            console.error(`Erreur config ravitaillement ${fleet.label}:`, error);
            await onWorkflowStepError(fleet.publicKey, error.message);
        }

    }


    async function executeMineStep(fleet) {
        const step = fleet.currentWorkflowStep;
        const targetStarbase = slyModule.getValidTargets().find(sb => sb.name === step.starbase);
        logger.log(4, "Step minage:");
        logger.log(4, targetStarbase);
        if (!targetStarbase) {
            throw new Error(`Starbase minage invalide: ${step.starbase}`);
        }

        logger.log(4, `Configuration minage ${fleet.label}: ${step.resource} à ${step.starbase}`);

        try {
            const fleetIndex = slyModule.getUserFleets().findIndex(f => f.publicKey.toBase58() === fleet.publicKey.toBase58());
            if (fleetIndex === -1) return;

            // Sauvegarder l'assignation actuelle
            let fleetSavedData = await GM.getValue(fleet.publicKey.toString(), '{}');
            let fleetParsedData = JSON.parse(fleetSavedData);
            fleet.workflowOriginalAssignment = fleetParsedData.assignment;

            // Configurer comme Mine
            fleetParsedData.assignment = 'Mine';
            fleetParsedData.mineResource = step.resource;
            fleetParsedData.starbase = `${targetStarbase.x},${targetStarbase.y}`;

            // Mettre à jour slyModule.getUserFleets()
            slyModule.getUserFleets()[fleetIndex].mineResource = cargoItems.find(r => r.name == step.resource).token;
            slyModule.getUserFleets()[fleetIndex].starbaseCoord = `${targetStarbase.x},${targetStarbase.y}`;
            slyModule.getUserFleets()[fleetIndex].destCoord = `${targetStarbase.x},${targetStarbase.y}`;
            await GM.setValue(fleet.publicKey.toString(), JSON.stringify(fleetParsedData));

            logger.log(4, `Minage configuré pour ${fleet.label}`);

        } catch (error) {
            console.error(`Erreur config minage ${fleet.label}:`, error);
            await onWorkflowStepError(fleet.publicKey, error.message);
        }
    }

    // Fonction appelée quand un step de workflow est terminé
    async function onWorkflowStepCompleted(fleetKey) {
        const workflowKey = `workflow_${fleetKey}`;
        const workflowSteps = await GM.getValue(workflowKey, []);
        const workflowDataKey = `workflow_data_${fleetKey}`;
        let workflowData = await GM.getValue(workflowDataKey, {
            currentStepIndex: 0,
            stepState: 'ready',
            lastStepTime: Date.now(),
            stepRetryCount: 0
        });

        // Passer au step suivant
        workflowData.currentStepIndex++;
        workflowData.stepRetryCount = 0;
        workflowData.lastStepTime = Date.now();

        // Si on a atteint la fin, recommencer au début
        if (workflowData.currentStepIndex >= workflowSteps.length) {
            workflowData.currentStepIndex = 0;
            logger.log(4, `Workflow cycle completed for fleet ${fleetKey}, restarting from beginning`);
        }

        // Sauvegarder les nouvelles données
        await GM.setValue(workflowDataKey, workflowData);

        // Trouver la flotte et continuer avec le step suivant
        const fleetIndex = slyModule.getUserFleets().findIndex(f => f.publicKey === fleetKey);

        if (fleetIndex !== -1) {
            logger.log(4, `Fleet index ${fleetIndex}, restarting from beginning`);
            await initializeWorkflowForFleet(slyModule.getUserFleets()[fleetIndex], workflowSteps);

            // Rafraîchir la liste des étapes pour mettre à jour l'étape active
            if (currentFleetKey === fleetKey) {
                await refreshWorkflowStepsList();
            }

            // Délai avant le prochain step pour éviter de surcharger
            setTimeout(() => {
                startWorkflowFleet(fleetIndex);
            }, 2000);

            logger.log(4, `Fleet ${slyModule.getUserFleets()[fleetIndex].label} advanced to workflow step ${workflowData.currentStepIndex}`);
        }
    }

    // Fonction pour gérer les erreurs de workflow
    async function onWorkflowStepError(fleetKey, error) {
        const workflowDataKey = `workflow_data_${fleetKey}`;
        let workflowData = await GM.getValue(workflowDataKey, {
            currentStepIndex: 0,
            stepState: 'error',
            lastStepTime: Date.now(),
            stepRetryCount: 0
        });

        workflowData.stepRetryCount++;
        workflowData.lastError = error;
        workflowData.lastErrorTime = Date.now();

        const fleet = slyModule.getUserFleets().find(f => f.publicKey.toBase58() === fleetKey);

        if (workflowData.stepRetryCount >= 3) {
            // Après 3 tentatives, passer au step suivant
            logger.log(4, `Max retries reached for fleet ${fleetKey}, skipping to next step. Error: ${error}`);
            updateFleetState(fleet, `Error: Skipping step`);
            await onWorkflowStepCompleted(fleetKey);
        } else {
            // Réessayer le step actuel après un délai
            logger.log(4, `Retrying workflow step for fleet ${fleetKey} (attempt ${workflowData.stepRetryCount}). Error: ${error}`);
            updateFleetState(fleet, `Error: Retrying (${workflowData.stepRetryCount}/3)`);
            await GM.setValue(workflowDataKey, workflowData);

            // Attendre avant de réessayer (délai exponentiel)
            const retryDelay = 5000 * workflowData.stepRetryCount;
            setTimeout(() => {
                const fleetIndex = slyModule.getUserFleets().findIndex(f => f.publicKey.toBase58() === fleetKey);
                if (fleetIndex !== -1) {
                    startWorkflowFleet(fleetIndex);
                }
            }, retryDelay);
        }
    }

    // Fonction utilitaire pour vérifier si une flotte a un workflow actif
    function hasActiveWorkflow(fleet) {
        return fleet.workflowData && fleet.workflowSteps && fleet.workflowSteps.length > 0;
    }

    // Fonction pour obtenir le statut détaillé d'une flotte
    function getFleetWorkflowStatus(fleet) {
        if (!hasActiveWorkflow(fleet)) {
            return 'No Workflow';
        }

        const step = fleet.currentWorkflowStep;
        const stepIndex = fleet.workflowData.currentStepIndex + 1;
        const totalSteps = fleet.workflowSteps.length;

        return `Step ${stepIndex}/${totalSteps}: ${step.type}`;
    }


    // Fonction pour mettre en évidence l'étape en cours
    function highlightCurrentStep(currentIndex) {
        const steps = document.querySelectorAll('#workflow-steps-list .step-item');
        steps.forEach((step, index) => {
            if (index === currentIndex) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    async function diagnoseWorkflowIssue(fleetKey) {
        const fleet = slyModule.getUserFleets().find(f => f.publicKey.toBase58() === fleetKey);
        if (!fleet) {
            logger.log(4, 'Fleet not found');
            return;
        }

        logger.log(4, '=== DIAGNOSTIC WORKFLOW ===');
        logger.log(4, 'Fleet Label:', fleet.label);
        logger.log(4, 'Fleet State:', fleet.state);
        logger.log(4, 'Current Step:', fleet.currentWorkflowStep);
        logger.log(4, 'Dest Coord:', fleet.destCoord);
        logger.log(4, 'Starbase Coord:', fleet.starbaseCoord);
        logger.log(4, 'Starting Coords:', fleet.startingCoords);
        logger.log(4, 'Step Configured:', fleet.stepConfigured);

        // Vérifier les coordonnées réelles
        try {
            let fleetAcctInfo = await slyModule.getAccountInfo(fleet.label, 'diagnostic', fleet.publicKey);
            slyModule.updateFleetMiscStats(fleet, fleetAcctInfo);
            let [fleetState, coords] = slyModule.getFleetState(fleetAcctInfo, fleet);

            logger.log(4, 'Real Fleet State:', fleetState);
            logger.log(4, 'Real Coordinates:', coords);

            // Vérifier les données workflow
            const workflowDataKey = `workflow_data_${fleetKey}`;
            const workflowData = await GM.getValue(workflowDataKey, {});
            logger.log(4, 'Workflow Data:', workflowData);

        } catch (error) {
            console.error('Error during diagnostic:', error);
        }

        logger.log(4, '=== FIN DIAGNOSTIC ===');
    }

    craftingBtn.addEventListener('click', async () => {
        if (!initComplete) {
            alert('Please load fleets first.');
            return;
        }
        updateView('crafting-view');
        craftingResource.innerHTML = slyModule.getCraftableItems.map(item => {
            const name = new TextDecoder().decode(new Uint8Array(item.account.namespace)).replace(/\0/g, '');
            return `<option value="${name}">${name}</option>`;
        }).join('');
        addCraftingTargets();
        await refreshCraftingJobsList();
    });

    // Ajout des options pour le menu déroulant de starbase
    function addCraftingTargets() {
        craftingStarbase.innerHTML = slyModule.getValidTargets().map(starbase => `<option value="${starbase.name}">${starbase.name}</option>`).join('');
    }

    // Ajout d'une tâche de crafting
    async function addCraftingJob() {
        const resource = craftingResource.value;
        const starbaseName = craftingStarbase.value;
        const amount = parseInt(craftingAmount.value, 10);
        const crew = parseInt(craftingCrew.value, 10);

        if (!resource || !starbaseName || isNaN(amount) || amount <= 0 || isNaN(crew) || crew <= 0) {
            alert('Please select a resource, starbase, and enter valid amount and crew number.');
            return;
        }

        const starbaseData = slyModule.getValidTargets().find(sb => sb.name === starbaseName);
        if (!starbaseData) {
            alert('Invalid starbase selected.');
            return;
        }

        const coordinates = `${starbaseData.x},${starbaseData.y}`;
        const label = `Craft_${resource}_${starbaseName}_${Date.now()}`; // Label unique

        const craftData = {
            label,
            item: resource,
            coordinates,
            starbaseName, // Ajout pour l'affichage
            amount,
            crew,
            state: 'Idle',
            special: '', // Valeurs par défaut
            belowAmount: '',
            errorCount: 0,
            craftingId: 0,
            craftingCoords: coordinates,
            feeAtlas: 0
        };

        // Sauvegarder les données du job sous la clé label
        await GM.setValue(label, JSON.stringify(craftData));

        // Ajouter le label à la liste des jobs
        let craftLabels = await GM.getValue('crafting_jobs', []);
        craftLabels.push(label);
        await GM.setValue('crafting_jobs', craftLabels);

        logger.log(4, `Crafting job added: ${JSON.stringify(craftData)}`);
        await refreshCraftingJobsList();
    }


    async function refreshCraftingJobsList() {
        console.log('Refreshing crafting jobs list');
        craftingJobsList.innerHTML = '';
        const craftLabels = await GM.getValue('crafting_jobs', []);
        console.log(`Loaded craftLabels: ${JSON.stringify(craftLabels)}`);

        const craftJobs = [];
        for (let label of craftLabels) {
            const dataStr = await GM.getValue(label, '{}');
            if (dataStr !== '{}') { // Vérifier si le job existe encore
                const data = JSON.parse(dataStr);
                craftJobs.push(data);
            } else {
                // Nettoyer si le label n'a plus de données
                craftLabels.splice(craftLabels.indexOf(label), 1);
                await GM.setValue('crafting_jobs', craftLabels);
            }
        }

        if (craftJobs.length > 0) {
            craftJobs.forEach((job, index) => {
                const jobItem = document.createElement('li');
                jobItem.classList.add('step-item');
                jobItem.dataset.jobIndex = index;
                jobItem.innerHTML = `
                    <span class="step-content" style="flex-grow: 1;">Craft ${job.amount} ${job.item} at ${job.starbaseName} with ${job.crew} crew (${job.state})</span>
                    <button class="delete-step-btn" data-index="${index}">X</button>
                `;
                craftingJobsList.appendChild(jobItem);
            });
        } else {
            const noJobsItem = document.createElement('li');
            noJobsItem.classList.add('step-item');
            noJobsItem.textContent = 'No crafting jobs.';
            craftingJobsList.appendChild(noJobsItem);
        }
    }

    craftingJobsList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-step-btn')) {
            const index = parseInt(event.target.dataset.index, 10);
            console.log(`Deleting crafting job at index ${index}`);

            // Récupérer la liste des labels
            let craftLabels = await GM.getValue('crafting_jobs', []);
            console.log(`Current craftLabels before deletion: ${JSON.stringify(craftLabels)}`);

            // Supprimer les données du job
            if (index >= 0 && index < craftLabels.length) {
                const labelToDelete = craftLabels[index];
                await GM.deleteValue(labelToDelete);

                // Supprimer le label de la liste
                craftLabels.splice(index, 1);
                console.log(`craftLabels after deletion: ${JSON.stringify(craftLabels)}`);

                // Sauvegarder la liste mise à jour
                await GM.setValue('crafting_jobs', craftLabels);
                console.log(`Saved craftLabels to storage`);

                // Rafraîchir la liste affichée
                await refreshCraftingJobsList();
                console.log(`Crafting jobs list refreshed`);
            } else {
                console.warn(`Invalid index ${index} for craftLabels deletion`);
            }
        }
    });

    addCraftingJobBtn.addEventListener('click', async () => {
        console.log('Add Crafting Job clicked');
        await addCraftingJob();
    });

    // Exposer les fonctions pour utilisation immédiate
    window.workflowFix = {
        fixCoordinates: fixFleetCoordinates,
        forceContinuation: forceWorkflowContinuation,
        diagnose: diagnoseWorkflowIssue
    };

    // Initial state setup
    updateView('main-view');


})();
