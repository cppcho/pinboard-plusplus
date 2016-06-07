/* eslint no-param-reassign: "off" */
/* eslint func-names: "off" */
/* eslint no-extra-semi: "off" */
/* eslint wrap-iife: "off" */
/* eslint no-unused-vars: "off" */
/* eslint no-shadow-restricted-names: "off" */

// https://github.com/jquery-boilerplate/jquery-patterns/blob/master/patterns/jquery.basic.plugin-boilerplate.js

; (function ($, window, document, undefined) {
  const pluginName = 'tagcomplete';
  const defaults = {
    tags: [],
  };

  const TAGCOMPLETE_MAX_SUGGESTION = 9;
  const TAGCOMPLETE_WRAPPER_CLASS = 'tagcomplete';
  const TAGCOMPLETE_WRAPPER_HIDDEN_CLASS = 'tagcomplete--hidden';
  const TAGCOMPLETE_ITEM_CLASS = 'tagcomplete__item';
  const TAGCOMPLETE_ITEM_SELECTED_CLASS = 'tagcomplete__item--selected';

  const KEY_TAB = 9;
  const KEY_ENTER = 13;
  const KEY_SHIFT = 16;
  const KEY_ESC = 27;
  const KEY_LEFT = 37;
  const KEY_UP = 38;
  const KEY_RIGHT = 39;
  const KEY_DOWN = 40;

  const META_KEYS = [
    KEY_TAB,
    KEY_ENTER,
    KEY_SHIFT,
    KEY_ESC,
    KEY_LEFT,
    KEY_UP,
    KEY_RIGHT,
    KEY_DOWN,
  ];

  // The actual plugin constructor
  function Plugin(element, options) {
    this.options = $.extend({}, defaults, options);

    this.element = element;
    this.$element = $(element);

    this.selectedIndex = -1;
    this.suggestions = [];
    this.$tagcomplete = null;

    this.init();
  }

  Plugin.prototype = {

    init() {
      const html = `<div class="${TAGCOMPLETE_WRAPPER_CLASS} ${TAGCOMPLETE_WRAPPER_HIDDEN_CLASS}"></div>`;
      this.$tagcomplete = $(html).insertAfter(this.element);

      // bind events
      this.$element.on('keyup', this.onInputKeyUp.bind(this));
      this.$element.on('keydown', this.onInputKeyDown.bind(this));
      this.$element.on('blur', this.onInputBlur.bind(this));
      this.$element.on('focus', this.onInputFocus.bind(this));
      this.$tagcomplete.on('mouseover', this.onItemMouseOver.bind(this));
      this.$tagcomplete.on('mousedown', this.onItemMouseDown.bind(this));
    },

    onInputKeyDown(e) {
      if (this.suggestions.length > 0) {
        if (e.which === KEY_DOWN) {
          if (this.selectedIndex < this.suggestions.length - 1) {
            e.preventDefault();
            this.selectedIndex++;
            this.updateHighlight();
          }
        } else if (e.which === KEY_UP) {
          e.preventDefault();
          if (this.suggestions.length > 1 && this.selectedIndex > 0) {
            this.selectedIndex--;
            this.updateHighlight();
          }
        } else if (e.which === KEY_TAB || e.which === KEY_ENTER) {
          e.preventDefault();
          this.useSelectedSuggestion();
        }
      }
    },

    onInputKeyUp(e) {
      if (META_KEYS.indexOf(e.which) === -1) {
        this.updateSuggestionsForCurrentInput();
        this.render();
      }
    },

    onInputBlur() {
      this.suggestions = [];
      this.render();
    },

    onInputFocus() {
      this.updateSuggestionsForCurrentInput();
      this.render();
    },

    onItemMouseOver(e) {
      e.preventDefault();

      const $item = $(e.target);
      if ($item.hasClass(TAGCOMPLETE_ITEM_CLASS)) {
        this.selectedIndex = $item.data('index');
        this.updateHighlight();
      }
    },

    onItemMouseDown(e) {
      e.preventDefault();

      const $item = $(e.target);
      if ($item.hasClass(TAGCOMPLETE_ITEM_CLASS)) {
        this.useSelectedSuggestion();
      }
    },

    // update the highlight (selection) based on this.selectedIndex
    updateHighlight() {
      this.$tagcomplete
        .find(`.${TAGCOMPLETE_ITEM_SELECTED_CLASS}`)
        .removeClass(TAGCOMPLETE_ITEM_SELECTED_CLASS);
      this.$tagcomplete
        .find(`.${TAGCOMPLETE_ITEM_CLASS}`)
        .filter(`[data-index=${this.selectedIndex}]`)
        .addClass(TAGCOMPLETE_ITEM_SELECTED_CLASS);
    },

    // update this.suggestions based on the last word
    updateSuggestionsForCurrentInput() {
      const suggestions = [];
      const tags = this.$element.val().split(/[\s,]+/);
      const lastTag = tags.pop();

      if (lastTag) {
        const regex = new RegExp(`^${lastTag}`, 'i');
        if (lastTag) {
          this.options.tags.forEach(tag => {
            if (tag.match(regex)) {
              suggestions.push(tag);
            }
          });
        }
      }

      this.suggestions = suggestions.slice(0, TAGCOMPLETE_MAX_SUGGESTION);
    },

    // replace last word with selected suggestion
    // clear this.suggestions
    useSelectedSuggestion() {
      const selectedSuggestion = this.suggestions[this.selectedIndex];
      if (selectedSuggestion) {
        const tags = this.$element.val().split(/[\s,]+/).filter(v => v);
        const tagsLength = tags.length;
        if (tagsLength > 0) {
          tags[tagsLength - 1] = selectedSuggestion;
          this.$element.val(`${tags.join(' ')} `);

          this.suggestions = [];
          this.render();
        }
      }
    },

    // render tag suggestion box based on this.suggestions
    // reset the value of this.selectedIndex
    render() {
      if (this.suggestions.length > 0) {
        this.selectedIndex = 0;
        const html = this.suggestions.map((suggestion, index) =>
          `<div class="${TAGCOMPLETE_ITEM_CLASS}" data-index="${index}" data-tag="${suggestion}">${suggestion}</div>`
        ).join('');
        this.$tagcomplete.html(html).removeClass(TAGCOMPLETE_WRAPPER_HIDDEN_CLASS);
        this.updateHighlight();
      } else {
        this.selectedIndex = -1;
        this.$tagcomplete.empty().addClass(TAGCOMPLETE_WRAPPER_HIDDEN_CLASS);
      }
    },
  };

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, `plugin_${pluginName}`)) {
        $.data(this, `plugin_${pluginName}`,
          new Plugin(this, options));
      }
    });
  };
})($, window, document);
