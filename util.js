(function () {

    /*
    * Executable part
    * */

    var $confirmModal = null;
    var $confirmModal_title = null;
    var $confirmModal_content = null;
    var $confirmModal_confirmButton = null;
    var $confirmModal_cancelButton = null;

    var $commentsModal = null;
    var $commentsModal_title = null;
    var $commentsModal_loadComments = null;
    var $commentsModal_commentList = null;
    var $commentsModal_form = null;
    var $commentsModal_idInput = null;
    var $commentsModal_commentText = null;
    var commentHtmlTemplate = null;

    var $attachmentsModal = null;
    var $attachmentsModal_title = null;
    var $attachmentsModal_attachmentList = null;
    var $attachmentsModal_attachmentView = null;
    var $attachmentsModal_form = null;
    var $attachmentsModal_idInput = null;
    var $attachmentsModal_fileInput = null;
    var attachmentHtmlTemplate = null;

    var $templateModal = null;
    var $templateModal_dialog = null;
    var $templateModal_title = null;
    var $templateModal_body = null;

    var modalContentTemplates = {};

    var modalConfirmTypes = {
        confirm: {},
        remove: {
            title: 'Подтвердите удаление',
            confirmText: 'Удалить',
            confirmClasses: 'btn-danger',
        },
        default: {
            title: 'Подтвердите действие',
            text: 'Вы действительно хотите это сделать?',
            confirmText: 'Подтвердить',
            cancelText: 'Отмена',
            confirmClasses: 'btn-success',
        },
    };

    $(function () {
        initUtilElementsInContext($(document));
    });

    window.initUtilElementsInContext = function ($context) {

        if ($.fn.tooltip) {
            $context.find('[data-toggle="tooltip"]').tooltip();
        }

        $context.find('.selectpicker').each(function () {
            var $this = $(this);
            if ($this.closest('.js-template, .bootstrap-select').length === 0 && $this.selectpicker) {
                $this.selectpicker('refresh');
            }
        });

        $context.find('.form-select[multiple]').each(function () {
            var $this = $(this);
            if ($this.bsMultiSelect) {
                $this.bsMultiSelect({
                    useChoicesDynamicStyling: true,
                });
            }
        });

        $context.find('.input-group.date[id]').each(function (e) {
            var $picker = $(this);
            if (!$picker.attr('data-datetimepicker-options')) {
                return;
            }
            var options = JSON.parse($picker.attr('data-datetimepicker-options'));
            $picker.datetimepicker(options);
            if (options.minDate || options.maxDate) {
                $picker.data('DateTimePicker').date('<?= $value ?>' || null);
            }
        });

        $context.find('.accordion-toggle-row').each(function () {
            var $tr = $(this);
            var $accordion = $tr.next().find('div.accordion-body').first();
            $accordion.on('show.bs.collapse', function (e) {
                $(e.target).closest('tr').prev().find('i.indicator').addClass('fa-rotate-180');
            });
            $accordion.on('hide.bs.collapse', function (e) {
                $(e.target).closest('tr').prev().find('i.indicator').removeClass('fa-rotate-180');
            });
        });

        $('[data-export-table-selector]').each(function () {
            var $exportButton = $(this);
            var tableSelector = $exportButton.data('export-table-selector');
            var stylesheetSelector = $exportButton.data('export-stylesheet-selector');

            var $table = $(tableSelector);
            var $stylesheet = null;
            var stylesheetContent = null;

            if (stylesheetSelector) {
                $stylesheet = $(stylesheetSelector);
                stylesheetContent = $stylesheet[0].outerHTML;

                var preserve = $stylesheet.data('preserve');
                var shouldPreserve = preserve === '' || preserve === 'true';

                if (!shouldPreserve) {
                    $stylesheet.remove();
                }
            }

            var exportLinksByExtensions = {
                xls: '/ajax/export_table_to_xls.php',
                pdf: '/ajax/export_table_to_pdf.php',
            };

            $exportButton.click(function (e) {
                var filename = $exportButton.data('export-filename');
                var orientation = $exportButton.data('export-orientation');
                var extension = filename.split('.').pop();

                openWithPost({
                    url: exportLinksByExtensions[extension],
                    target: '_top',
                    data: {
                        filename: filename,
                        content: $table[0].outerHTML,
                        orientation: orientation,
                        stylesheet: stylesheetContent,
                    },
                });
            });
        });

        ensureTemplateModal();

        $context.find('[data-click-callback]').each(function () {
            var $this = $(this);
            var callback = window[$this.data('click-callback')] || function () {};
            var args = $this.data('click-callback-args') || [];

            if (!Array.isArray(args)) {
                args = [args];
            }

            makeCallFuncOnClickElement($this, callback, ...args);
        });

        $context.find('[data-modal-template], [data-modal-url]').each(function () {
            var $this = $(this);

            $this.click(function (e) {
                e.preventDefault();
                showTemplateModal($this);
            });
        });

        $context.find('[data-modal-content-src]').each(function () {
            var $this = $(this);

            var modalTypes = {
                object: showObjectPreviewModal,
                iframe: showIframeModal,
                image: showImageModal,
            };

            $this.click(function (e) {
                e.preventDefault();

                var modalType = $this.data('modal-type');
                var modalFunc = modalTypes[modalType] ?? function () {};

                modalFunc({
                    contentSrc: $this.data('modal-content-src'),
                    title: $this.data('modal-title'),
                    size: $this.data('modal-size'),
                });
            });
        });

        $context.find('[data-preview-input]').each(function () {
            var $this = $(this);
            var inputSelector = $this.data('preview-input');
            var $input = $(inputSelector);

            bindImagePreview($input, $this);
        });

        processAjaxAttributesForElements($context.find('form[data-ajax], a[data-ajax]'));
        processPostAttributesForElements($context.find('a[data-post]'));
        processModalAttributesForElements($context.find('[data-modal-class]'));

        $context.find('[data-modal-confirm]').click(function (e) {
            var $this = $(this);

            if (!$this.data('modal-confirm')) {
                return;
            }

            if ($this.data('skip-modal-confirm-listener')) {
                $this.data('skip-modal-confirm-listener', false);
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if ($this.attr('disabled') === 'disabled') {
                return;
            }

            var value = $this.data('modal-confirm');
            var options = getModalConfirmOptions($this, value);

            modalConfirm(options);
        });

        function getModalConfirmOptions($this, modalType) {

            var callbackOptions = {
                callback: function () {
                    $this.data('skip-modal-confirm-listener', true);
                    if ($this.is('a')) {
                        $this.click();
                    } else {
                        $this.closest('form').submit();
                    }
                },
            };

            var customOptions = {};
            if ($this.data('modal-confirm-text')) {
                customOptions.text = $this.data('modal-confirm-text');
            }

            return $.extend(
                callbackOptions,
                modalConfirmTypes['default'],
                modalConfirmTypes[modalType] || {},
                customOptions
            );
        }
    };

    window.processAjaxAttributesForElements = function (selectorOrElements) {
        var $elements = selectorOrElements;
        if (typeof selectorOrElements === 'string') {
            $elements = $(selectorOrElements);
        }
        $elements.each(function () {
            var $this = $(this);

            var value = $this.data('ajax');
            var redirectUrl = $this.data('redirect');
            var makeAjaxElementFunc = $this.is('form') ? makeAjaxForm : makeAjaxLink;

            if (value === 'reload') {
                makeAjaxElementFunc($this, {
                    success: function (responseText) {
                        location.reload();
                    }
                });

            } else if (value === 'reload-with-id') {
                var idParamName = $this.data('id-param-name') || 'id';
                var idFieldName = $this.data('id-field-name') || 'id';

                makeAjaxElementFunc($this, {
                    success: function (responseText) {
                        if (responseText) {
                            let response = parseJson(responseText);

                            if (response.id) {
                                let params = urlParamsToArray(location.href);

                                params[idParamName] = response[idFieldName];

                                location.href = '?' + arrayToUrlParams(params);
                            } else {
                                location.reload();
                            }
                        } else {
                            location.reload();
                        }
                    }
                });

            } else if (value === 'reload-modal') {
                makeAjaxElementFunc($this, {
                    success: function (responseText) {
                        if ($templateModal.has($this)) {
                            reloadTemplateModal();
                        } else {
                            location.reload();
                        }
                    }
                });

            } else if (value === 'redirect') {
                makeAjaxElementFunc($this, redirectUrl);

            } else if (value === 'back') {
                makeAjaxElementFunc($this, document.referrer);

            } else if (value === 'log') {
                makeAjaxElementFunc($this, {
                    success: function (responseText, status, xhr) {
                        logAjaxResponse(responseText, status, xhr);
                    }
                });

            } else if (value === 'callback') {
                makeAjaxElementFunc($this, {
                    beforeSend: function () {
                        $this.trigger('start.ajax');
                    },
                    complete: function () {
                        $this.trigger('complete.ajax');
                    },
                    success: function (responseText) {
                        $this.trigger('success.ajax', responseText);
                    },
                });

            } else if (value === 'raw') {
                // Nothing
            }
        });
    };

    window.processPostAttributesForElements = function (selectorOrElements) {
        var $elements = selectorOrElements;
        if (typeof selectorOrElements === 'string') {
            $elements = $(selectorOrElements);
        }
        $elements.each(function () {
            var $this = $(this);
            if (!$this.data('js-ajax-click-listener') && $this.attr('data-post')) {
                makePostLink($this);
            }
        });
    };

    window.processModalAttributesForElements = function (selectorOrElements) {
        var $elements = selectorOrElements;
        if (typeof selectorOrElements === 'string') {
            $elements = $(selectorOrElements);
        }
        $elements.click(function (e) {
            e.preventDefault();

            var $this = $(this);
            var modalType = $this.data('modal-class');
            var options = $this.data('modal-options');

            if (typeof options === 'string') {
                options = JSON.parse(options);
            }

            window['show' + modalType + 'Modal'](options);
        });
    };



    window.reformatDate = function(dateString, fromFormat, toFormat) {
        var parsedMoment = moment(dateString, fromFormat);
        if (!parsedMoment.isValid()) {
            return '';
        }
        return parsedMoment.format(toFormat);
    };

    window.dmyToYmd = function(dateString) {
        return reformatDate(dateString, 'DD.MM.YYYY', 'YYYY-MM-DD');
    };

    window.ymdToDmy = function(dateString) {
        return reformatDate(dateString, 'YYYY-MM-DD', 'DD.MM.YYYY');
    };

    window.ymdTo = function(dateString, toFormat) {
        return reformatDate(dateString, 'YYYY-MM-DD', toFormat);
    };

    window.dmyhisToYmdhis = function(dateString) {
        return reformatDate(dateString, 'DD.MM.YYYY HH:mm:ss', 'YYYY-MM-DD HH:mm:ss');
    };

    window.ymdhisToDmyhis = function(dateString) {
        return reformatDate(dateString, 'YYYY-MM-DD HH:mm:ss', 'DD.MM.YYYY HH:mm:ss');
    };

    window.ymdhisToDmy = function(dateString) {
        return reformatDate(dateString, 'YYYY-MM-DD HH:mm:ss', 'DD.MM.YYYY');
    };

    window.ymdhisTo = function(dateString, toFormat) {
        return reformatDate(dateString, 'YYYY-MM-DD HH:mm:ss', toFormat);
    };

    window.hisToHi = function(timeString) {
        return reformatDate(timeString, 'HH:mm:ss', 'HH:mm');
    };



    window.fetchTemplate = function (selectorOrElement) {
        var $template = selectorOrElement;
        if (typeof selectorOrElement === 'string') {
            $template = $(selectorOrElement);
        }
        $template.removeClass('js-template');
        $template.removeAttr('id');
        var html = $template.prop('outerHTML');
        $template.remove();
        return html;
    };

    window.createFromTemplate = function (templateHtml, replacements) {
        var html = templateHtml;
        $.each(replacements, function (key, value) {
            html = replaceTemplateKey(html, key, value);
        });
        return $(html);
    };

    window.replaceTemplateKey = function (html, key, value) {
        var regex = new RegExp('%' + key + '%', 'g');
        return html.replace(regex, value);
    };



    window.makeCallFuncOnClickElement = function ($elements, callback, argsOrFunc) {
        if (typeof $elements === 'string') {
            $elements = $($elements);
        }

        $elements.each(function () {
            var $element = $(this);

            $element.click(function (e) {
                var args = typeof argsOrFunc === 'function'
                    ? argsOrFunc($element)
                    : argsOrFunc;

                callback(args);
            });
        });
    };

    window.makeAjaxForm = function ($forms, ajaxOptions) {
        if (typeof $forms === 'string') {
            $forms = $($forms);
        }
        var options = resolveOptions(ajaxOptions);
        $forms.each(function () {
            var $form = $(this);
            if ($form.data('js-ajax-click-listener')) {
                return;
            }
            $form.submit(function (e) {
                e.preventDefault();
                // do not use .prop('disabled') as it doesn't work correctly if form contains an input named 'disabled'
                if ($form.attr('disabled')) {
                    return;
                }
                executeAjaxForm($form, options);
            });
            $form.data('js-ajax-click-listener', true);
        });
    };

    window.executeAjaxForm = function ($form, ajaxOptions) {

        if ($form.data('waiting-for-response')) {
            return;
        }

        var method = $form.attr('method') || 'get';

        var options = {
            url: $form.attr('action'),
            method: method,
        };
        if (method.toLowerCase() === 'post') {
            options.data = new FormData($form[0]);
            options.contentType = false;
            options.processData = false;
        } else {
            options.data = extractFormData($form[0]);
        }
        options = $.extend(options, resolveOptions(ajaxOptions));

        var completeListener = options.complete;
        options.complete = function (jqXHR, textStatus) {
            $form.data('waiting-for-response', false);
            if (completeListener) {
                completeListener(jqXHR, textStatus);
            }
        };

        $form.data('waiting-for-response', true);
        $.ajax(options);

        function extractFormData(form) {
            var data = {};
            var formData = new FormData(form);
            formData.forEach(function (value, key) {
                data[key] = key.indexOf('[') !== -1 ? formData.getAll(key) : formData.get(key);
            });
            return data;
        }
    };

    window.makeAjaxLink = function ($links, ajaxOptions) {
        if (typeof $links === 'string') {
            $links = $($links);
        }
        var options = resolveOptions(ajaxOptions);
        $links.each(function () {
            var $link = $(this);
            if ($link.data('js-ajax-click-listener')) {
                return;
            }
            if ($link.data('js-post-form-click-listener')) {
                $link.off('click', $link.data('js-post-form-click-listener'));
                $link.data('js-post-form-click-listener', null);
            }
            $link.click(function (e) {
                if ($link.data('modal-confirm') && !$link.data('skip-modal-confirm-listener')) {
                    return;
                }
                e.preventDefault();
                if ($link.is('[disabled]')) {
                    return false;
                }
                executeAjaxLink($link, options);
                return false;
            });
            $link.data('js-ajax-click-listener', true);
        });
    };

    window.executeAjaxLink = function ($link, ajaxOptions) {

        if ($link.data('waiting-for-response')) {
            return;
        }

        var defaultOptions = {
            url: $link.attr('href'),
            method: $link.data('post') ? 'post' : 'get',
            data: $link.data('post'),
            type: 'json',
        };
        var options = $.extend(
            defaultOptions,
            resolveOptions(ajaxOptions)
        );

        var completeListener = options.complete;
        options.complete = function (jqXHR, textStatus) {
            $link.data('waiting-for-response', false);
            if (completeListener) {
                completeListener(jqXHR, textStatus);
            }
        };

        $link.data('waiting-for-response', true);
        $.ajax(options);
    };

    window.makePostLink = function ($links) {
        if (typeof $links === 'string') {
            $links = $($links);
        }

        $links.each(function () {
            var $link = $(this);

            if ($link.data('js-post-form-click-listener')) {
                return;
            }
            if ($link.data('js-ajax-click-listener')) {
                $link.off('click', $link.data('js-ajax-click-listener'));
                $link.data('js-ajax-click-listener', null);
            }

            var listener = function (e) {
                if ($link.data('modal-confirm') && !$link.data('skip-modal-confirm-listener')) {
                    return;
                }

                e.preventDefault();
                executePostLink($link);
                return false;
            };

            $link.click(listener);
            $link.data('js-post-form-click-listener', listener);
        });
    };

    window.executePostLink = function ($link) {

        if ($link.data('waiting-for-response')) {
            return;
        }

        $link.data('waiting-for-response', true);

        var $form = $('<form>');
        var postData = $link.attr('data-post');

        $form.attr('action', $link.attr('href'));
        $form.attr('method', postData ? 'post' : 'get');
        $form.hide();

        if (postData) {
            var pairs;
            if (postData[0] === '{') {
                pairs = parseJson(postData);
            } else {
                pairs = urlParamsToArray(postData);
            }
            $.each(pairs, function (name, value) {
                var $input = $('<input type="hidden">');
                $input.attr('name', name);
                $input.attr('value', value);
                $form.append($input);
            });
        }
        $(document.body).append($form);
        $form.submit();
    };

    function resolveOptions(ajaxOptions) {
        if (typeof ajaxOptions === 'string') {
            var redirectLink = ajaxOptions;
            ajaxOptions = {
                success: function (responseText) {
                    location.href = redirectLink;
                }
            };
        }
        return $.extend(
            {
                success: function (responseText) {
                    if (responseText) {
                        logAjaxResponse(responseText);
                    } else {
                        location.reload();
                    }
                }
            },
            ajaxOptions
        );
    }



    window.modalConfirm = function (options) {
        ensureConfirmModal();
        var defaultOptions = createDefaultConfirmModalOptions();
        options = $.extend({}, defaultOptions, options);

        $confirmModal_title.text(options.title);
        $confirmModal_content.text(options.text);
        $confirmModal_cancelButton.text(options.cancelText);
        $confirmModal_confirmButton.text(options.confirmText);
        $confirmModal_cancelButton.attr('class', 'btn cancel ' + options.cancelClasses);
        $confirmModal_confirmButton.attr('class', 'btn confirm ' + options.confirmClasses);

        $confirmModal_confirmButton.off('click');
        $confirmModal_confirmButton.click(function () {
            options.callback();
            $confirmModal.modal('hide');
        });

        $confirmModal.modal('show');
    };

    function ensureConfirmModal() {
        if ($confirmModal === null) {
            $confirmModal = $(createConfirmModalHtml());
            $confirmModal_title = $confirmModal.find('.modal-title');
            $confirmModal_content = $confirmModal.find('.modal-body');
            $confirmModal_confirmButton = $confirmModal.find('.modal-footer button.confirm');
            $confirmModal_cancelButton = $confirmModal.find('.modal-footer button.cancel');

            $(document).keyup(function(e) {
                var modalIsOpen = $confirmModal.is(':visible');
                if (modalIsOpen && e.keyCode === 27) {
                    $confirmModal_cancelButton.click();
                }
                if (modalIsOpen && e.keyCode === 13) {
                    $confirmModal_confirmButton.click();
                }
            });
        }
    }

    window.createConfirmModalHtml = function () {
        return '<div class="modal fade confirm-modal" role="dialog">\n' +
            '  <div class="modal-dialog">\n' +
            '    <div class="modal-content">\n' +
            '      <div class="modal-header">\n' +
            '        <button type="button" class="close" data-dismiss="modal">&times;</button>\n' +
            '        <h3 class="modal-title">HEADER</h3>\n' +
            '      </div>\n' +
            '      <div class="modal-body">\n' +
            '        CONTENT\n' +
            '      </div>\n' +
            '      <div class="modal-footer">\n' +
            '        <button type="button" class="btn btn-default cancel" data-dismiss="modal">CANCEL</button>\n' +
            '        <button type="button" class="btn btn-success confirm">CONFIRM</button>\n' +
            '      </div>\n' +
            '    </div>\n' +
            '  </div>\n' +
            '</div>';
    }

    window.createDefaultConfirmModalOptions = function () {
        return {
            title: 'Подтверждение действия',
            text: 'Подтвердите действие',
            confirmText: 'Подтвердить',
            cancelText: 'Отмена',
            confirmClasses: 'btn-success',
            cancelClasses: 'btn-default',
            callback: function () {},
        };
    };

    /**
     * Модальное окно для просмотра и добавления комментариев
     *
     * @param {Object} options - параметры модального окна
     * @param {string} options.title - заголовок модального окна
     * @param {int} options.id - id элемента, для которого нужно выводить/добавлять комментарии
     * @param {string} options.get_url - скрипт, возвращающий список комментариев
     * @param {string} options.get_id_param_name - параметр, в котором этому скрипту будет передаваться id элемента
     * @param {string} options.get_additional_params - дополнительные параметры для запроса
     * @param {string} options.response_param_name - имя параметра, в котором будут возвращаться комментарии
     * @param {string} options.post_url - скрипт, добавляющий комментарий
     * @param {string} options.post_id_param_name - параметр, в котором этому скрипту будет передаваться id элемента
     * @param {string} options.post_additional_params - дополнительные параметры для запроса
     * @param {string} options.post_text_param_name - имя параметра, в котором будет передаваться текст комментария
     * @param {boolean} options.can_add_comments - разрешить ли добавлять комментарии
     * @param {string} options.user_name - логин пользователя, отправляющего комментарий (не используется при отправке)
     * @param {function} options.author_name_formatter - форматер имени пользователя (в заголовках комментариев)
     * @param {boolean} options.use_unread_marks - выделять ли непрочитанные комментарии
     * @param {boolean} options.highlight_id - комментарий, который будет выделен
     * @param {boolean} options.show_load_more_button - отображать ли кнопку "Загрузить еще"
     * */
    window.showCommentsModal = function (options) {
        ensureCommentsModal();
        var defaultOptions = {
            title: 'Комментарии',
            id: null,
            get_url: null,
            get_id_param_name: 'id',
            response_param_name: 'comments',
            post_url: null,
            post_id_param_name: 'id',
            post_text_param_name: 'text',
            can_add_comments: false,
            author_name_formatter: function (comment) {
                return comment.author_name || '-';
            },
            user_name: null,
            use_unread_marks: false,
            highlight_id: null,
        };
        options = $.extend({}, defaultOptions, options);

        $commentsModal.modal('show');
        $commentsModal_loadComments.toggle(options.show_load_more_button || false);

        var canAddComments = options.can_add_comments === null
            ? options.post_url !== null
            : options.can_add_comments;

        $commentsModal_title.text(options.title);
        $commentsModal_form.attr('action', options.post_url);
        $commentsModal_form.toggle(canAddComments);
        $commentsModal_commentList.empty();
        $commentsModal_idInput.attr('name', options.post_id_param_name);
        $commentsModal_idInput.attr('value', options.id);

        var ajaxData = $.extend({}, options.get_additional_params);
        ajaxData[options.get_id_param_name] = options.id;

        loadComments(ajaxData, true);

        $commentsModal_form.off('submit');

        $commentsModal_form.submit(function (e) {
            e.preventDefault();

            var text = $commentsModal_commentText.val().trim();
            if (text.length) {
                $commentsModal_commentText.prop('disabled', true);

                var data = $.extend({}, options.post_additional_params);
                data[options.post_id_param_name] = $commentsModal_idInput.val();
                data[options.post_text_param_name] = text;

                $.ajax({
                    url: $commentsModal_form.attr('action'),
                    method: $commentsModal_form.attr('method'),
                    data: data,
                    success: function (responseText) {
                        var $comment = createFromTemplate(commentHtmlTemplate, {
                            author_name: options.user_name,
                            datetime: moment().format('DD.MM.YYYY в HH:mm'),
                            text: text,
                            unread: 0,
                        });
                        $commentsModal_commentList.append($comment);
                        $commentsModal_commentText.val('');
                        $commentsModal_commentList.scrollTop(99999999);
                    },
                    complete: function () {
                        $commentsModal_commentText.prop('disabled', false);
                    }
                });
            }
        });

        $commentsModal_loadComments.off('click');

        $commentsModal_loadComments.click(function (e) {
            e.preventDefault();
            loadComments(ajaxData);
        });

        function loadComments(ajaxData, loadToHighlighted) {
            $commentsModal_loadComments.addClass('blocked');
            ajaxData.offset = $commentsModal_commentList.find('.comment').length;
            $.ajax({
                url: options.get_url,
                method: 'get',
                data: ajaxData,
                type: 'json',
                success: function (responseText) {
                    var response = parseJson(responseText);
                    var comments = response;
                    if (options.response_param_name) {
                        comments = response[options.response_param_name];
                    }
                    comments = reformatComments(comments);
                    fillComments(comments);
                    $commentsModal_loadComments.removeClass('blocked');

                    if (comments.length === 0) {
                        $commentsModal_loadComments.hide();
                    }

                    if (loadToHighlighted && options.highlight_id) {
                        var highlightedComment = $.grep(comments, function (comment) {
                            return comment.id == options.highlight_id;
                        })[0] || null;

                        if (!highlightedComment) {
                            loadComments(ajaxData, true);
                        }
                    }
                }
            });
        }

        function fillComments(comments) {
            $.each(comments, function (index, comment) {
                var $comment = createFromTemplate(commentHtmlTemplate, comment);
                $commentsModal_commentList.prepend($comment);
            });
        }

        function reformatComments(comments) {
            comments = JSON.parse(JSON.stringify(comments));
            if (comments.length > 0 && comments[0].datetime) {
                comments.sort(function (a, b) {
                    return new Date(b.datetime) - new Date(a.datetime);
                });
            }
            $.each(comments, function (index, comment) {
                comment.author_name = options.author_name_formatter(comment);
                comment.datetime = moment(comment.datetime).format('DD.MM.YYYY в HH:mm');
                comment.text = (comment.text || '').replace(/\n/g, '<br />');
                comment.unread = options.use_unread_marks ? comment.unread : 0;
                comment.highlighted = options.highlight_id && comment.id == options.highlight_id ? 1 : 0;
            });
            return comments;
        }
    };

    function ensureCommentsModal() {
        if ($commentsModal === null) {
            commentHtmlTemplate =
                '<div class="comment"\n' +
                '     data-id="%id%"\n' +
                '     data-unread="%unread%"\n' +
                '     data-highlighted="%highlighted%"\n' +
                '     style="background-color: rgb(240, 240, 200, %highlighted%);">\n' +
                '  <div class="header">\n' +
                '    <span class="author">%author_name%</span>\n' +
                '    <span class="datetime">%datetime%</span>\n' +
                '    <span class="unread-label" style="opacity: %unread%;">новое</span>\n' +
                '  </div>\n' +
                '  <div class="text">\n' +
                '    %text%\n' +
                '  </div>\n' +
                '</div>\n';
            $commentsModal = $(
                '<div id="comments-modal" class="modal fade">\n' +
                '  <div role="document" class="modal-dialog">\n' +
                '    <div class="modal-content">\n' +
                '      <div class="modal-header">\n' +
                '        <button type="button" data-dismiss="modal" aria-label="Close" class="close">\n' +
                '          <span aria-hidden="true">\n' +
                '            <i class="fa fa-close"></i>\n' +
                '          </span>\n' +
                '        </button>\n' +
                '        <h3 class="modal-title">\n' +
                '          TITLE\n' +
                '        </h3>\n' +
                '      </div>\n' +
                '      <div class="modal-body">\n' +
                '        <div class="row comment-list-block">\n' +
                '          <div class="col-md-12 text-center">\n' +
                '            <a href="#" class="load-comments">\n' +
                '              Загрузить еще\n' +
                '            </a>\n' +
                '          </div>\n' +
                '          <div class="col-md-12">\n' +
                '            <div class="comment-list">\n' +
                '              COMMENTS\n' +
                '            </div>\n' +
                '          </div>\n' +
                '          <div class="col-md-12">\n' +
                '            <form action="POST_URL" method="post" class="inputs">\n' +
                '              <input type="hidden" class="id-input" name="ID" value="-1" />\n' +
                '              <div class="comment-text">\n' +
                '                <textarea class="form-control" name="text" title="Текст комментария"></textarea>\n' +
                '              </div>\n' +
                '              <button class="o-btn send-comment" title="Отправить">\n' +
                '                <i class="fa fa-chevron-right"></i>\n' +
                '              </button>\n' +
                '            </form>\n' +
                '          </div>\n' +
                '        </div>\n' +
                '      </div>\n' +
                '    </div>\n' +
                '  </div>\n' +
                '</div>\n'
            );
            $commentsModal_title = $commentsModal.find('.modal-title');
            $commentsModal_loadComments = $commentsModal.find('.modal-body .load-comments');
            $commentsModal_commentList = $commentsModal.find('.modal-body .comment-list');
            $commentsModal_form = $commentsModal.find('.modal-body form');
            $commentsModal_idInput = $commentsModal.find('.modal-body input.id-input');
            $commentsModal_commentText = $commentsModal.find('.modal-body textarea');

            $commentsModal.on('shown.bs.modal', function (event) {
                var $highlightedComment = $commentsModal_commentList.find('[data-highlighted=1]');
                if ($highlightedComment.length) {
                    $highlightedComment.get(0).scrollIntoView();
                } else {
                    $commentsModal_commentList.scrollTop(99999999);
                }
            });

            $(document.body).append($commentsModal);
        }
    }

    /**
     * Модальное окно для просмотра и добавления файлов
     *
     * @param {Object} options - параметры модального окна
     * @param {string} options.title - заголовок модального окна
     * @param {int} options.id - id элемента, для которого нужно выводить/добавлять файлы
     * @param {string} options.files_url - базовый путь к файлам (к нему будет добавляться например "/filename.png")
     * @param {string} options.get_url - скрипт, возвращающий список файлов
     * @param {string} options.get_id_param_name - параметр, в котором этому скрипту будет передаваться id элемента
     * @param {string} options.get_additional_params - дополнительные параметры для запроса
     * @param {string} options.response_files_param_name - имя параметра, в котором будут возвращаться файлы
     * @param {string} options.post_url - скрипт, добавляющий выбранные файлы
     * @param {string} options.post_id_param_name - параметр, в котором этому скрипту будет передаваться id элемента
     * @param {string} options.post_additional_params - дополнительные параметры для запроса
     * @param {string} options.post_files_param_name - имя параметра, в котором будут передаваться файлы
     * @param {boolean} options.can_add_files - разрешить ли добавлять файлы
     * @param {boolean} options.show_preview - отображать ли окно предпросмотра
     * @param {boolean} options.show_info - отображать ли информацию о файле
     * @param {string} options.accept_mime_types - допустимые mime-типы для вайлов
     * @param {function} options.on_show - слушатель, вызываемый при событии show.bs.modal
     * @param {function} options.on_shown - слушатель, вызываемый при событии shown.bs.modal
     * @param {function} options.on_hide - слушатель, вызываемый при событии hide.bs.modal
     * @param {function} options.on_hidden - слушатель, вызываемый при событии hidden.bs.modal
     * */
    window.showAttachmentsModal = function (options) {
        ensureAttachmentsModal();
        var defaultOptions = {
            title: 'Вложения',
            id: null,
            files_url: null,
            get_url: null,
            get_id_param_name: 'id',
            response_files_param_name: 'attachments',
            post_url: null,
            post_id_param_name: 'id',
            post_files_param_name: 'attachments',
            can_add_files: null,
            show_preview: true,
            show_info: true,
            accept_mime_types: '',
            on_show: null,
            on_shown: null,
            on_hide: null,
            on_hidden: null,
        };
        options = $.extend({}, defaultOptions, options);

        $attachmentsModal.modal('show');

        $attachmentsModal.off('show.bs.modal');
        if (options.on_show) {
            $attachmentsModal.on('show.bs.modal', options.on_show);
        }
        $attachmentsModal.off('shown.bs.modal');
        if (options.on_shown) {
            $attachmentsModal.on('shown.bs.modal', options.on_shown);
        }
        $attachmentsModal.off('hide.bs.modal');
        if (options.on_hide) {
            $attachmentsModal.on('hide.bs.modal', options.on_hide);
        }
        $attachmentsModal.off('hidden.bs.modal');
        if (options.on_hidden) {
            $attachmentsModal.on('hidden.bs.modal', options.on_hidden);
        }

        var canAddAttachments = options.can_add_files === null
            ? options.post_url !== null
            : options.can_add_files;

        $attachmentsModal_title.text(options.title);
        $attachmentsModal_idInput.attr('name', options.post_id_param_name);
        $attachmentsModal_idInput.val(options.id);
        $attachmentsModal_fileInput.attr('name', options.post_files_param_name + '[]');
        $attachmentsModal_fileInput.attr('accept', options.accept_mime_types);
        $attachmentsModal_attachmentList.empty();
        $attachmentsModal_form.attr('action', options.post_url);
        $attachmentsModal_form.toggle(canAddAttachments);
        $attachmentsModal_attachmentView.removeAttr('src');
        $attachmentsModal_attachmentView.toggle(options.show_preview);

        var data = $.extend({}, options.get_additional_params);
        data[options.get_id_param_name] = options.id;

        $.ajax({
            url: options.get_url,
            method: 'get',
            data: data,
            type: 'json',
            success: function (responseText) {
                var response = parseJson(responseText);
                var attachments = response[options.response_files_param_name];
                if (!attachments) {
                    console.error('No attachments returned: ' +
                        'response[' + options.response_files_param_name + '] = ' + attachments);
                    return;
                }
                reformatAttachments(attachments);
                fillAttachments(attachments);
            }
        });

        $attachmentsModal_fileInput.off('change');

        $attachmentsModal_fileInput.on('change', function(event) {
            var formData = new FormData($attachmentsModal_form[0]);
            $.each(options.post_additional_params || {}, function (key, value) {
                formData.append(key, value);
            });
            $.ajax({
                url: options.post_url,
                method: 'post',
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                success: function (responseText) {
                    var response = parseJson(responseText);
                    var attachments = response[options.response_files_param_name];
                    if (!attachments) {
                        console.error('No attachments returned: ' +
                            'response[' + options.response_files_param_name + '] = ' + attachments);
                        return;
                    }
                    reformatAttachments(attachments);
                    fillAttachments(attachments);
                }
            });
        });

        function reformatAttachments(attachments) {
            var filesUrl = options.files_url.replace('%id%', options.id);
            $.each(attachments, function (index, attachment) {
                attachment.id = options.id;
                attachment.url = filesUrl + '/' + attachment.filename;
                if (attachment.datetime) {
                    attachment.datetime_formatted = moment(attachment.datetime).format('DD.MM.YYYY в HH:mm');
                }
            });
            attachments.sort(function (a, b) {
                return parseInt(a.name) - parseInt(b.name);
            });
        }

        function fillAttachments(attachments) {
            $.each(attachments, function (index, attachment) {
                var $attachment = createFromTemplate(attachmentHtmlTemplate, attachment);
                var showInfo = !!(options.show_info && attachment.user_name && attachment.datetime);
                $attachment.find('.attachment-info').toggle(showInfo);
                $attachmentsModal_attachmentList.append($attachment);
                if (!options.show_preview) {
                    $attachment.find('.open-in-tab').hide();
                }
            });
        }
    };

    function ensureAttachmentsModal() {
        if ($attachmentsModal === null) {
            attachmentHtmlTemplate =
                '<div class="attachment">\n' +
                '  <div class="attachment-content">\n' +
                '    <a class="open-in-tab" href="%url%" target="_blank">\n' +
                '      Открыть в новой вкладке\n' +
                '    </a>\n' +
                '    <a class="open-in-frame" href="%url%">\n' +
                '      %name%\n' +
                '    </a>\n' +
                '  </div>\n' +
                '  <div class="attachment-info postscript">\n' +
                '    <span class="user-name">%user_name%</span>,\n' +
                '    <span class="datetime">%datetime_formatted%</span>\n' +
                '  </div>\n' +
                '</div>\n';
            $attachmentsModal = $(
                '<div id="attachments-modal" class="modal fade">\n' +
                '  <div role="document" class="modal-dialog">\n' +
                '    <div class="modal-content">\n' +
                '      <div class="modal-header">\n' +
                '        <div class="inner-header">\n' +
                '          <h3 class="modal-title">\n' +
                '            TITLE\n' +
                '          </h3>\n' +
                '          <form action="POST_URL" method="post">\n' +
                '            <input type="hidden" class="id-input" name="POST_ID_PARAM_NAME" value="-1" />\n' +
                '            <label class="btn btn-success upload">\n' +
                '              Добавить\n' +
                '              <input type="file" name="POST_FILES_PARAM_NAME" style="display: none;" multiple>\n' +
                '            </label>\n' +
                '          </form>\n' +
                '          <button type="button" data-dismiss="modal" aria-label="Close" class="close">\n' +
                '            <span aria-hidden="true">\n' +
                '              <i class="fa fa-close"></i>\n' +
                '            </span>\n' +
                '          </button>\n' +
                '        </div>\n' +
                '      </div>\n' +
                '      <div class="modal-body">\n' +
                '        <div class="row">\n' +
                '          <div class="col-md-12">\n' +
                '            <div class="attachment-list">\n' +
                '            </div>\n' +
                '          </div>\n' +
                '          <div class="col-md-12">\n' +
                '            <iframe class="attachment-view" src="/_common/empty_attachment_view.php"></iframe>\n' +
                '          </div>\n' +
                '        </div>\n' +
                '      </div>\n' +
                '    </div>\n' +
                '  </div>\n' +
                '</div>\n'
            );
            $attachmentsModal_title = $attachmentsModal.find('.modal-title');
            $attachmentsModal_form = $attachmentsModal.find('.modal-header form');
            $attachmentsModal_idInput = $attachmentsModal.find('.modal-header input.id-input');
            $attachmentsModal_fileInput = $attachmentsModal.find('.modal-header input[type="file"]');
            $attachmentsModal_attachmentList = $attachmentsModal.find('.modal-body .attachment-list');
            $attachmentsModal_attachmentView = $attachmentsModal.find('.modal-body .attachment-view');

            $attachmentsModal_attachmentList.on('click', 'a.open-in-frame', function (e) {
                e.preventDefault();

                var $link = $(this);
                var href = $link.attr('href');

                if ($attachmentsModal_attachmentView.is(':visible')) {
                    $attachmentsModal_attachmentView.attr('src', href);
                } else {
                    window.open(href, '_blank');
                }
            });

            $(document.body).append($attachmentsModal);
        }
    }

    function ensureTemplateModal() {
        if ($templateModal === null) {
            $templateModal = $(createTemplateModalHtml());
            $templateModal_dialog = $templateModal.find('.modal-dialog');
            $templateModal_title = $templateModal.find('.modal-title');
            $templateModal_body = $templateModal.find('.modal-body');

            $templateModal_dialog.data('initial-classes', $templateModal_dialog.attr('class'));
            $templateModal_body.empty();

            $templateModal.on('show.bs.modal', function (event) {
                if (event.target !== event.currentTarget) {
                    return;
                }

                var options = event.relatedTarget;

                setupTemplateModal(options);
            });

            $templateModal.on('hide.bs.modal', function (event) {
                if (event.target !== event.currentTarget) {
                    return;
                }

                var $content = $templateModal.data('content');
                var modalOptions = $templateModal.data('options');

                $content.trigger('tm.content.hide', {});

                if (modalOptions.closeCallback) {
                    modalOptions.closeCallback($content, modalOptions);
                }
            });

            $(document.body).append($templateModal);
        }
    }

    window.createTemplateModalHtml = function () {
        return '<div id="template-modal" class="modal fade">\n' +
            '  <div role="document" class="modal-dialog">\n' +
            '    <div class="modal-content">\n' +
            '      <div class="modal-header">\n' +
            '        <button type="button" data-dismiss="modal" aria-label="Close" class="close">\n' +
            '          <span aria-hidden="true">\n' +
            '            <i class="fa fa-close"></i>\n' +
            '          </span>\n' +
            '        </button>\n' +
            '        <h3 class="modal-title">\n' +
            '          TITLE\n' +
            '        </h3>\n' +
            '      </div>\n' +
            '      <div class="modal-body">\n' +
            '        CONTENT\n' +
            '      </div>\n' +
            '    </div>\n' +
            '  </div>\n' +
            '</div>\n';
    }

    window.setupTemplateModal = function (options) {

        var $template = options.$template ? options.$template
            : options.templateHtml ? $(options.templateHtml)
                : options.templateUrl ? null
                    : getModalContentTemplate(options.templateId);
        var title = options.title || '';
        var size = options.size || '';
        var replacements = options.replacements || [];
        var eventOptions = options.options || [];

        var initialClasses = $templateModal_dialog.data('initial-classes');

        $templateModal.data('options', options);
        $templateModal_dialog.attr('class', initialClasses + ' ' + size);
        $templateModal_title.html(title);

        if (options.templateUrl) {
            $.get(options.templateUrl, options.templateUrlOptions)
                .done(function (responseText) {
                    $template = $(responseText);
                    onTemplateModalLoaded();
                });
        } else {
            onTemplateModalLoaded();
        }

        function onTemplateModalLoaded() {
            if ($template) {
                $.each(replacements, function (key, replacementDescriptor) {
                    var selector = replacementDescriptor.selector;
                    var $element = $template.find(selector);
                    if (replacementDescriptor.hasOwnProperty('value')) {
                        var value = replacementDescriptor.value;
                        $element.val(value === undefined ? '' : value);
                    }
                    if (replacementDescriptor.hasOwnProperty('text')) {
                        $element.text(replacementDescriptor.text || '');
                    }
                    if (replacementDescriptor.hasOwnProperty('html')) {
                        $element.html(replacementDescriptor.html || '');
                    }
                    if (replacementDescriptor.hasOwnProperty('attributes')) {
                        $.each(replacementDescriptor.attributes, function (name, value) {
                            if (typeof value === 'boolean') {
                                $element.prop(name, value);
                            } else if (value === null) {
                                $element.removeAttr(name);
                            } else {
                                $element.attr(name, value);
                            }
                        });
                    }
                    if ($element.is('select')) {
                        $element.selectpicker('refresh');
                    }
                });
                $templateModal_body.children().detach();
                $templateModal_body.append($template);

                $templateModal.data('content', $template);
            }

            initUtilElementsInContext($templateModal_body);

            if (options.triggerShowEvent) {
                if ($template.length === 1) {
                    $template.trigger('tm.content.show', eventOptions);
                } else {
                    $template.filter('div:not(.js-template)').trigger('tm.content.show', eventOptions);
                }
            }
        }
    };

    window.showTemplateModal = function (optionsOrElement) {
        var options = prepareTemplateModalOptions(optionsOrElement);

        if (options.closeable) {
            $templateModal.attr('data-backdrop', true);
            $templateModal.attr('data-keyboard', true);
        } else {
            $templateModal.attr('data-backdrop', 'static');
            $templateModal.attr('data-keyboard', false);
        }

        $templateModal.modal('show', options);
    };

    window.hideTemplateModal = function (options) {
        $templateModal.modal('hide');
    };

    window.reloadTemplateModal = function (options) {
        options = $.extend($templateModal.data('options') || {}, options);
        setupTemplateModal(options);
    };

    function prepareTemplateModalOptions(optionsOrElement) {
        var options;

        if (typeof optionsOrElement === 'object' && !(optionsOrElement instanceof jQuery)) {
            optionsOrElement.triggerShowEvent = true;

            options = optionsOrElement;

        } else {
            var $button = $(optionsOrElement);

            options = {
                templateId: $button.data('modal-template'),
                templateUrl: $button.data('modal-url'),
                templateUrlOptions: $button.data('modal-url-params') || [],
                title: $button.data('modal-title'),
                size: $button.data('modal-size'),
                replacements: $button.data('modal-replacements') || [],
                options: $button.data('modal-options') || [],
                closeable: $button.data('closeable'),
                triggerShowEvent: true,
            };
        }

        options.closeable = options.closeable === undefined ? true : options.closeable;

        return options;
    }

    function getModalContentTemplate(templateId) {

        if (!templateId) {
            return null;
        }

        if (!modalContentTemplates[templateId]) {
            modalContentTemplates[templateId] = $(templateId);
        }

        var $template = modalContentTemplates[templateId];

        $template.removeClass('js-template');
        $template.detach();

        return $template;
    }

    window.showCropImageModal = function (options) {
        var $template = $(
            '<div>' +
            '  <div>' +
            '    <img src="" />' +
            '  </div>' +
            '  <button class="btn btn-block btn-success">Обрезать</button>' +
            '</div>'
        );
        var $img = $template.find('img');
        var $cropButton = $template.find('button');

        $img.attr('src', options.imageSrc);
        $img.css('display', 'none');
        $cropButton.prop('disabled', true);

        var defaultOptions = {
            $template: $template,
            title: 'Обрезать изображение',
        };

        var modalOptions = $.extend(defaultOptions, options);

        $template.on('tm.content.show', function () {
            setTimeout(function () {
                $img.croppie(options.cropperOptions);
                $cropButton.prop('disabled', false);
            }, 1000);
        });

        $templateModal.one('hide.bs.modal', function () {
            $img.croppie('result', 'base64').then(function(imageData) {
                options.callback(imageData);
            });
        });

        $cropButton.click(function (e) {
            hideTemplateModal();
        });

        showTemplateModal(modalOptions);
    };

    window.showObjectPreviewModal = function (options) {
        var $template = $(
            '<div class="object-preview-container">' +
            '  <div class="object-wrapper">' +
            '    <object type="" data="" />' +
            '  </div>' +
            '</div>'
        );
        var $object = $template.find('object');

        if (options.contentType) {
            $object.attr('type', options.contentType);
        }
        $object.attr('data', options.contentSrc);

        var defaultOptions = {
            $template: $template,
            size: 'fullscreen width-auto',
        };

        var modalOptions = $.extend(defaultOptions, options);

        showTemplateModal(modalOptions);
    };

    window.showIframeModal = function (options) {
        var $template = $(
            '<div>' +
            '  <div>' +
            '    <iframe src="" />' +
            '  </div>' +
            '</div>'
        );
        var $iframe = $template.find('iframe');

        $iframe.attr('src', options.contentSrc);

        var defaultOptions = {
            $template: $template,
            size: 'fullscreen width-auto',
        };

        var modalOptions = $.extend(defaultOptions, options);

        showTemplateModal(modalOptions);
    };

    window.showImageModal = function (options) {
        var $template = $(
            '<div class="center-block d-flex align-items-center justify-content-center">' +
            '  <a href="#" target="_blank" class="raffle-image-container in-modal" style="height: 100%">' +
            '    <img class="raffle-image" src=""/>' +
            '  </a>' +
            '</div>'
        );
        var $link = $template.find('a');
        var $image = $template.find('img');

        $link.attr('href', options.contentSrc);
        $image.attr('src', options.contentSrc);

        var defaultOptions = {
            $template: $template,
            size: 'fullscreen-v width-auto',
        };

        var modalOptions = $.extend(defaultOptions, options);

        showTemplateModal(modalOptions);
    };

    window.showOrderSearchModal = function (options) {
        showAjaxTemplateModal({
            modalUrl: '/_common/modals/order_search/modal_content.php',
            ajaxData: {
                order_type: options.order_type,
                required: options.required,
                selected_order_id: options.selected_order_id,
                linked_order_id: options.linked_order_id,
            },
            modalOptions: {
                title: 'Поиск заказов',
                size: 'fullscreen',
            },
            responseCallback: function ($template, modalOptions) {
                $template.on('click', '.select-order-button', function (e) {
                    var $button = $(this);
                    var orderId = +$button.data('order-id') || 0;
                    var order = $button.data('order') || null;

                    hideTemplateModal();

                    options.callback(orderId, order);
                });
            }
        });
    };

    window.showClaimListModal = function (options) {
        showAjaxTemplateModal({
            modalUrl: '/_common/modals/claim_list/modal_content.php',
            ajaxData: {
                custom_id: options.custom_id,
                metering_id: options.metering_id,
            },
            modalOptions: {
                title: 'Список рекламаций',
                size: 'fullscreen',
            }
        });
    };

    window.showPretensionListModal = function (options) {
        showAjaxTemplateModal({
            modalUrl: '/_common/modals/pretension_list/modal_content.php',
            ajaxData: {
                custom_id: options.custom_id,
                metering_id: options.metering_id,
            },
            modalOptions: {
                title: 'Список претензий',
                size: 'fullscreen',
            }
        });
    };

    window.showConditionConstructorModal = function (options) {
        showAjaxTemplateModal({
            modalUrl: '/_common/modals/condition_constructor/modal_content.php',
            ajaxData: {
                required: options.required,
                fieldset: options.fieldset,
                conditions: options.conditions,
            },
            modalOptions: {
                title: 'Конструктор условий',
                size: 'fullscreen-v modal-lg',
            },
            responseCallback: function ($template, modalOptions) {
                $template.on('success.ajax', 'form', function (e, responseText) {

                    var json = parseJson(responseText);
                    var conditions = Object.values(json.conditions || {});

                    hideTemplateModal();

                    options.callback(conditions);
                });
            }
        });
    };

    window.showAccessConstructorModal = function (options) {
        showAjaxTemplateModal({
            modalUrl: '/_common/modals/access_constructor/modal_content.php',
            ajaxData: {
                required: options.required,
                accesses: options.accesses,
            },
            modalOptions: {
                title: 'Конструктор доступов',
                size: 'fullscreen-v auto-width',
            },
            responseCallback: function ($template, modalOptions) {
                $template.on('success.ajax', 'form', function (e, responseText) {

                    var json = parseJson(responseText);
                    var accesses = Object.values(json.accesses || {});

                    hideTemplateModal();

                    options.callback(accesses);
                });
            }
        });
    };

    window.showMapsModal = function (options) {
        showAjaxTemplateModal({
            modalUrl: '/_common/modals/maps/yandex_maps/modal_content.php',
            ajaxData: {
                center_coords: options.center_coords,
                search_query: options.search_query,
                zoom: options.zoom,
            },
            modalOptions: {
                title: 'Выбор адреса',
                size: 'fullscreen-v modal-lg',
                closeCallback: function ($template, modalOptions) {
                    let result = $template.data('result');

                    options.callback(result);
                },
            },
        });
    };

    /**
     * Модальное окно для просмотра и добавления файлов
     *
     * @param {Object} options - параметры
     * @param {string} options.modalUrl - url, с которого будет загружаться содержимое модального окна
     * @param {Object} options.ajaxData - данные для запроса modalUrl
     * @param {Object} options.modalOptions - параметры модального окна
     * @param {function} options.responseCallback - слушатель, вызываемый при успешной загрузке modalUrl
     * */
    window.showAjaxTemplateModal = function (options) {
        $.get(options.modalUrl, options.ajaxData).done(function (responseText) {
            var $template = $(responseText);
            var defaultOptions = {
                $template: $template,
            };

            var modalOptions = $.extend(defaultOptions, options.modalOptions);

            if (options.responseCallback) {
                options.responseCallback($template, modalOptions);
            }

            showTemplateModal(modalOptions);
        });
    };



    window.nl2br = function (str, is_xhtml) {
        var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
        return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
    };

    window.urlParamsToArray = function (url) {
        var request = {};
        var searchPart = url.indexOf('?') === -1 ? url : url.substring(url.indexOf('?') + 1);
        var pairs = searchPart.split('&');
        for (var i = 0; i < pairs.length; i++) {
            if (!pairs[i]) {
                continue;
            }
            var pair = pairs[i].split('=');
            request[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
        return request;
    };

    window.arrayToUrlParams = function (array) {
        var pairs = [];
        for (var key in array) {
            if (array.hasOwnProperty(key)) {
                pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(array[key]));
            }
        }
        return pairs.join('&');
    };

    window.replaceUrlParam = function (url, paramName, paramValue) {
        if (paramValue == null) {
            paramValue = '';
        }
        var pattern = new RegExp('\\b(' + paramName + '=).*?(&|#|$)');
        if (url.search(pattern) >= 0) {
            return url.replace(pattern, '$1' + paramValue + '$2');
        }
        url = url.replace(/[?#]$/, '');
        return url + (url.indexOf('?') > 0 ? '&' : '?') + paramName + '=' + paramValue;
    };

    window.logAjaxResponse = function (responseText, status, xhr) {
        try {
            console.log(JSON.parse(responseText));
        } catch (e) {
            console.log(responseText);
        }
        if (status) {
            console.log('STATUS:', status);
        }
        if (xhr) {
            console.log('XHR:', xhr);
        }
        $('body .content').append(responseText);
        $('body .root').append(responseText);
    };

    window.arrayGroupBy = function (array, keyOrFunc) {
        return array.reduce(
            function (result, item) {
                var key = typeof keyOrFunc === 'function' ? keyOrFunc(item) : item[keyOrFunc];
                result[key] = result[key] || [];
                result[key].push(item);
                return result;
            },
            Object.create(null)
        );
    };

    window.formatNumber = function (number, decimals, trimZeros) {
        decimals = decimals !== undefined ? decimals : 0;
        trimZeros = trimZeros !== undefined ? trimZeros : true;
        var fixed = (+number).toFixed(decimals);
        var formatted = trimZeros ? parseFloat(fixed) : fixed;
        return formatted
            .toLocaleString('en-US')
            .replace(/,/g, '\xa0'); // It's &nbsp;
    };

    window.formatPhoneNumber = function (phoneNumber) {
        var length = phoneNumber.length;

        if (length > 10) {
            return phoneNumber.replace(/^(\d+)(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1 ($2) $3-$4-$5');

        } else if (length === 10) {
            return phoneNumber.replace(/^(\d{3})(\d{3})(\d{2})(\d{2})$/, '8 ($1) $2-$3-$4');

        } else if (length >= 5 && length <= 7) {
            return phoneNumber.replace(/^(\d+)(\d{2})(\d{2})$/, '$1-$2-$3');

        } else {
            return phoneNumber;
        }
    };

    window.formatMoney = function (amount, displayType, currency) {
        currency = currency || 'RUB';
        displayType = displayType || 'symbol'; // name, symbol, code

        var formatter = new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: currency,
            currencyDisplay: displayType,
        });

        return formatter.format(amount);
    };

    window.isValidPhoneNumber = function (phoneNumber) {
        return /^\+?\d{11,13}$/.test(phoneNumber);
    };

    window.parseJson = function (jsonText) {
        if (!jsonText) {
            return null;
        }

        try {
            return JSON.parse(jsonText);
        } catch (e) {
            logAjaxResponse(jsonText);
            return null;
        }
    };

    /**
     * Связывает два select'а, отображая в дочернем списке только те элементы, которые являются дочерними для элемента,
     * который будет выбран в родительском списке.
     *
     * @param {Object} options - параметры связывания
     * @param {string} options.parent_select - список с родительскими элементами
     * @param {string} options.child_select - список с дочерними элементами
     * @param {string} options.id_attribute_name - атрибут, в котором у дочерних элементов хранится id родителя
     * @param {boolean} options.add_listener - если false, дочерний элемент обновится единожды, а при изменении
     * выбранного элемента обновлений не будет
     * */
    window.bindSelectItems = function (options) {
        var $parentSelect = options['parent_select'];
        var $childSelect = options['child_select'];
        var attrName = options['id_attribute_name'];
        var addListener = options['add_listener'] || options['add_listener'] === undefined;

        var typeId = $parentSelect.val();

        $childSelect.find('option').hide();
        $childSelect.find('option[' + attrName + '="' + typeId + '"]').show();
        $childSelect.find('option[value=""]').show();
        if ($childSelect.find('option:selected').css('display') === 'none') {
            $childSelect.val(null);
        }

        var $visibleOptions = $childSelect.find('option').filter(function () {
            return $(this).css('display') !== 'none';
        });
        var disabled = $visibleOptions.length === 0 || ($visibleOptions.length === 1 && $visibleOptions.val() === '');
        $childSelect.prop('disabled', disabled);

        $childSelect.selectpicker('refresh');

        if (addListener) {
            $parentSelect.change(function (e) {
                bindSelectItems($.extend({ add_listener: false }, options));
            });
        }
    };

    window.makeEditableList = function (options) {

        // Проверка обязательных полей

        if (options.containerSelector === undefined) {
            throw new Error("containerSelector is not set");
        }

        if (options.itemIdParameterName === undefined) {
            throw new Error("itemIdParameterName is not set");
        }

        if (options.fieldDescriptors === undefined) {
            throw new Error("fieldDescriptors is not set");
        }

        // Опции по умолчанию

        var defaultOptions = {
            confirmModalOptions: {},
            onAddRequestFinished: function () {},
            onEditRequestFinished: function () {},
            onRemoveRequestFinished: function () {},
        };
        options = $.extend({}, defaultOptions, options);

        var defaultFieldDescriptor = {
            view_value_setter: function ($view, value) {
                $view.find('span').text(value);
            },
            view_value_getter: function ($view) {
                return $view.find('span').text().trim();
            },
            editor_value_setter: function ($editor, value) {
                $editor.find('input').val(value);
            },
            editor_value_getter: function ($editor) {
                return $editor.find('input').val();
            },
            editor_value_resetter: function ($editor) {
                $editor.find('input').val('');
            }
        };

        $.each(options.fieldDescriptors, function (index, descriptor) {
            options.fieldDescriptors[index] = $.extend({}, defaultFieldDescriptor, descriptor);
        });

        // Инициализация

        var $containerDiv = $(options.containerSelector);
        var $listDiv = $containerDiv.find('.editable-item-list');
        var $addItemForm = $containerDiv.find('form.add-editable-item-form');
        var itemTemplateHtml = fetchTemplate(options.containerSelector + ' .editable-item.js-template');
        var itemEditorTemplateHtml = fetchTemplate(options.containerSelector + ' .editable-item-editor.js-template');

        $.each(options.fieldDescriptors, function (index, descriptor) {
            var $fieldEditor = getFieldEditor($addItemForm, descriptor.name);
            descriptor.editor_value_resetter($fieldEditor);
        });

        makeAjaxForm($addItemForm, {
            success: function (responseText) {

                var response = parseJson(responseText);
                var itemId = response[options.itemIdParameterName];
                var replacements = {
                    id: itemId,
                };

                var $item = createFromTemplate(itemTemplateHtml, replacements);

                $.each(options.fieldDescriptors, function (index, descriptor) {
                    var $fieldView = getFieldView($item, descriptor.name);
                    var $fieldEditor = getFieldEditor($addItemForm, descriptor.name);
                    descriptor.view_value_setter($fieldView, descriptor.editor_value_getter($fieldEditor));
                    descriptor.editor_value_resetter($fieldEditor);
                });

                $listDiv.append($item);

                initItemDiv($item);

                options.onAddRequestFinished(response, $item, $addItemForm);
            }
        });

        $listDiv.find('.editable-item').each(function () {
            initItemDiv($(this));
        });

        function initItemDiv($item) {

            var $viewControls = $item.find('.controls.view');
            var $removeLink = $item.find('.remove-link');
            var $editLink = $item.find('.edit-link');

            var $editControls = $item.find('.controls.edit');
            var $confirmEditLink = $item.find('.confirm-edit-link');
            var $cancelEditLink = $item.find('.cancel-edit-link');

            var $fieldViews = $item.find('[data-name]');
            var $editor = null;

            $removeLink.click(function (e) {
                e.preventDefault();
                var modalOptions = $.extend(
                    {
                        callback: function () {
                            executeAjaxLink($removeLink, {
                                success: function (responseText) {
                                    var response = parseJson(responseText);
                                    var $removedItem = $removeLink.closest('.editable-item');
                                    $removedItem.remove();
                                    options.onRemoveRequestFinished(response, $removedItem);
                                }
                            });
                        },
                    },
                    options.confirmModalOptions
                );
                modalConfirm(modalOptions);
            });

            $editLink.click(function (e) {
                e.preventDefault();
                startEdit();
            });

            $cancelEditLink.click(function (e) {
                e.preventDefault();
                cancelEdit();
            });

            $confirmEditLink.click(function (e) {
                e.preventDefault();
                executeAjaxForm($editor.find('form'), {
                    success: function (responseText) {

                        var response = parseJson(responseText);
                        $.each(options.fieldDescriptors, function (index, descriptor) {
                            var $fieldView = getFieldView($item, descriptor.name);
                            var $fieldEditor = getFieldEditor($editor, descriptor.name);
                            descriptor.view_value_setter($fieldView, descriptor.editor_value_getter($fieldEditor));
                        });
                        options.onEditRequestFinished(response, $item, $editor);
                        cancelEdit();
                    }
                });
            });

            function startEdit() {
                $fieldViews.hide();
                $viewControls.removeClass('active');
                $editControls.addClass('active');

                var itemId = $item.data('id');
                var replacements = {};
                replacements[options.itemIdParameterName] = itemId;

                $editor = createFromTemplate(itemEditorTemplateHtml, replacements);

                $.each(options.fieldDescriptors, function (index, descriptor) {
                    var $fieldView = getFieldView($item, descriptor.name);
                    var $fieldEditor = getFieldEditor($editor, descriptor.name);
                    descriptor.editor_value_setter($fieldEditor, descriptor.view_value_getter($fieldView));
                });

                $item.append($editor);
            }

            function cancelEdit() {
                $fieldViews.show();
                $viewControls.addClass('active');
                $editControls.removeClass('active');

                $editor.remove();
                $editor = null;
            }
        }

        function getFieldView($itemView, name) {
            return $itemView.find('.field-view[data-name="' + name + '"]');
        }

        function getFieldEditor($itemEditor, name) {
            return $itemEditor.find('.field-editor[data-name="' + name + '"]')
        }
    };

    window.addImageUploaderToQuill = function (quillEditor, imagesFolder, $form) {

        function selectLocalImage() {
            var input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();

            input.onchange = () => {
                var file = input.files[0];

                if (/^image\//.test(file.type)) {
                    saveToServer(file);
                } else {
                    console.warn('You could only upload images.');
                }
            };
        }

        function saveToServer(file) {
            var formData = new FormData();
            formData.append('image', file);
            formData.append('path', imagesFolder);

            $.post({
                url: '/ajax/upload_image.php',
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                success: function (responseText) {
                    var response = parseJson(responseText);
                    insertToEditor(response.filename);
                }
            });
        }

        function insertToEditor(url) {
            var range = quillEditor.getSelection();
            quillEditor.insertEmbed(range.index, 'image', '/uploaded_images/' + imagesFolder + '/' + url);
            $form.append('<input type="hidden" name="uploaded_images[]" value="' + url + '" />');
        }

        function getImgUrls(delta) {
            return delta.ops.filter(i => i.insert && i.insert.image).map(i => i.insert.image);
        }



        quillEditor.getModule('toolbar').addHandler('image', selectLocalImage);

        quillEditor.on('text-change', function(delta, oldDelta, source) {
            var oldImageUrls = getImgUrls(oldDelta);
            var newImageUrls = getImgUrls(quillEditor.getContents());
            var deletedImageUrls = $(oldImageUrls).not(newImageUrls).get();
            $.each(deletedImageUrls, function (index, url) {
                var filename = url.split('/').pop();
                var $uploadInput = $form.find('input[name="uploaded_images[]"][value="' + filename + '"]');
                $uploadInput.remove();

                if ($uploadInput.length) {
                    $.post({
                        url: '/ajax/remove_uploaded_image.php',
                        data: {
                            path: imagesFolder + '/' + filename,
                        },
                        success: function (responseText) {
                            // Nothing
                        }
                    });
                } else {
                    $form.append('<input type="hidden" name="images_to_remove[]" value="' + filename + '" />');
                }
            });
        });
    };

    window.isInViewport = function ($element) {
        var elementTop = $element.offset().top;
        var elementBottom = elementTop + $element.outerHeight();

        var viewportTop = $(window).scrollTop();
        var viewportBottom = viewportTop + $(window).height();

        return elementBottom > viewportTop && elementTop < viewportBottom;
    };

    window.attachFlyingButton = function (options) {
        var $element = options.$element;
        var $button = $('<button style="position: absolute; z-index: 10000;">');
        var detachTimeoutId = null;

        $button.click(options.callback || function () {});
        $button.css(options.css || {});
        $button.attr('class', options.classes || 'btn btn-success');

        $element.focus(showFlyingButton);
        $element.blur(hideFlyingButton);
        $button.blur(hideFlyingButton);

        function showFlyingButton() {
            var title = typeof options.title === 'funciton'
                ? options.title()
                : options.title;
            $button.text(title || '...');

            if (detachTimeoutId) {
                clearTimeout(detachTimeoutId);
                detachTimeoutId = null;
            }
            $(document.body).append($button);
            $button.css({
                left: ($element.offset().left + $element.outerWidth() + 16) + 'px',
                top: $element.offset().top + 'px',
            });
        }

        function hideFlyingButton() {
            if (detachTimeoutId) {
                clearTimeout(detachTimeoutId);
            }
            detachTimeoutId = setTimeout(function () {
                if (!$button.is(':focus')) {
                    $button.detach();
                }
            }, 100);
        }
    };

    window.bindImagePreview = function ($input, $previewImg) {
        $input.change(function() {
            var input = this;
            var file = input.files ? input.files[0] : null;

            if (file) {
                var reader = new FileReader();

                reader.onload = function(e) {
                    $previewImg.attr('src', e.target.result);
                };

                reader.readAsDataURL(file);
            }
        });
    }



    window.loadPageContent = function (url, ajaxOptions) {
        $.get(url, ajaxOptions)
            .done(function (responseText) {
                replacePageContentFromPageHtml(responseText);
            });
    };

    window.replacePageContentFromPageHtml = function (html) {
        var $document = htmlToJQueryDom(html);
        var $content = getPageContentFromDocument($document);
        replacePageContent($content.html());
    }

    window.replacePageContent = function (html) {
        var $contentContainer = getPageContentFromDocument($(document));
        $contentContainer.html(html);
    }

    window.htmlToJQueryDom = function (html) {
        var dom = new window.DOMParser().parseFromString(html, 'text/html');
        return dom ? $(dom) : null;
    }

    window.openWithPost = function (options) {
        var form = document.createElement('form');
        form.target = options.target || '_blank';
        form.method = 'POST';
        form.action = options.url;
        form.style.display = 'none';

        for (var key in options.data) {
            var input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = options.data[key];
            form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    };

    function getPageContentFromDocument($document) {
        return $document.find('#main-page-wrap > div.content');
    }
})();
