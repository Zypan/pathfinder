/**
 * Main setupPage application
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/worker'
], function($, Init, Util, MapWorker) {
    'use strict';

    let config = {
        splashOverlayClass: 'pf-splash'                     // class for "splash" overlay
    };

    /**
     * set page observer
     */
    let setPageObserver = () => {
        let body = $('body');

        // collapse ---------------------------------------
        body.find('[data-toggle="collapse"]').css({cursor: 'pointer'}).on('click', function(){
            $(this).find('.pf-animate-rotate').toggleClass('right');
        });

        // buttons ----------------------------------------
        // exclude "download" && "navigation" buttons
        body.find('.btn').not('.navbar-fixed-bottom .btn').not('[href^="?export"]').on('click', function(e){
            $('.' + config.splashOverlayClass).showSplashOverlay();
        });

        // tooltips ---------------------------------------
        body.initTooltips();

        // change url (remove logout parameter)
        if (history.pushState) {
            history.pushState({}, '', location.protocol + '//' + location.host + location.pathname);
        }
    };

    /**
     * perform a basic check if Clients (browser) can connect to the webSocket server
     */
    let testWebSocket = () => {
        let tcpSocketPanel = $('#pf-setup-tcpSocket');
        let webSocketPanel = $('#pf-setup-webSocket');
        let webSocketURI = MapWorker.getWebSocketURL();
        let sslIcon = webSocketURI.startsWith('wss:') ?
            '<i class="fas fa-fw fa-lock txt-color txt-color-success"></i>' :
            '<i class="fas fa-fw fa-unlock txt-color txt-color-warning"></i>';

        webSocketPanel.showLoadingAnimation();

        let removeColorClasses = (el) => {
            el.removeClass (function (index, css) {
                return (css.match (/\btxt-color-\S+/g) || []).join(' ');
            });
        };

        /**
         * updates the WebSocket panel with new data
         * @param data
         */
        let updateWebSocketPanel = (data) => {
            if(data.uri){
                let uriRow = webSocketPanel.find('.panel-body table tr');
                uriRow.find('td:nth-child(2) kbd').html(data.uri.value);
                if(data.uri.status){
                    let statusIcon = uriRow.find('td:nth-child(3) i');
                    removeColorClasses(statusIcon);

                    statusIcon.toggleClass('fa-exclamation-triangle', false).toggleClass('fa-check', true).addClass('txt-color-success');
                }
            }

            if(data.status){
                let footer = webSocketPanel.find('.panel-footer h3');
                removeColorClasses(footer);
                footer.text(data.status.label).addClass(data.status.class);
            }
        };

        // update initial
        updateWebSocketPanel({
            uri: {
                value: sslIcon + '&nbsp;' + webSocketURI,
                status: true
            },
            status: {
                label:  'CONNECTING...',
                class: 'txt-color-warning'
            }
        });

        // try to connect to WebSocket server
        let socket = new WebSocket(webSocketURI);

        socket.onopen = (e) => {
            updateWebSocketPanel({
                status: {
                    label:  'OPEN wait for response...',
                    class: 'txt-color-warning'
                }
            });

            // sent token and check response
            socket.send(JSON.stringify({
                task: 'healthCheck',
                load: tcpSocketPanel.data('token')
            }));

            webSocketPanel.hideLoadingAnimation();
        };

        socket.onmessage = (e) => {
            let response = JSON.parse(e.data);

            if(response === 1){
                // SUCCESS
                updateWebSocketPanel({
                    status: {
                        label:  'CONNECTED',
                        class: 'txt-color-success'
                    }
                });
            }else{
                // Got response but INVALID
                updateWebSocketPanel({
                    status: {
                        label:  'INVALID RESPONSE',
                        class: 'txt-color-warning'
                    }
                });
            }

        };

        socket.onerror = (e) => {
            updateWebSocketPanel({
                status: {
                    label:  'CONNECTION ERROR',
                    class: 'txt-color-danger'
                }
            });

            webSocketPanel.hideLoadingAnimation();
        };

        socket.onclose = (closeEvent) => {
            updateWebSocketPanel({
                status: {
                    label:  'CONNECTION FAILED',
                    class: 'txt-color-danger'
                }
            });

            webSocketPanel.hideLoadingAnimation();
        };
    };

    /**
     * main init "setup" page
     */
    $(function(){

        // show app information in browser console --------
        Util.showVersionInfo();

        // hide splash loading animation ------------------
        $('.' + config.splashOverlayClass).hideSplashOverlay();

        setPageObserver();

        testWebSocket();
    });
});