
/**
 * First we will load all of this project's JavaScript dependencies which
 * include Vue and Vue Resource. This gives a great starting point for
 * building robust, powerful web applications using Vue and Laravel.
 */

require('./bootstrap');

import VueTimeago from 'vue-timeago'
import VeeValidate, { Validator } from 'vee-validate'

window.Pikaday = require('pikaday');

// var Turbolinks = require("turbolinks")
// Turbolinks.start()

Vue.use(VueTimeago, {
    name: 'timeago', // component name, `timeago` by default
    locale: 'en-US',
    locales: {
        'en-US': [
            'just now',
            ['%s second ago', '%s seconds ago'],
            ['%s minute ago', '%s minutes ago'],
            ['%s hour ago', '%s hours ago'],
            ['%s day ago', '%s days ago'],
            ['%s week ago', '%s weeks ago'],
            ['%s month ago', '%s months ago'],
            ['%s year ago', '%s years ago'],
        ],
    },
});

Vue.use(VeeValidate);

Validator.extend('cpanel_verify', {
    getMessage: field => `Password is not complex enough.`,
    validate: value => {
        const url = '/client-area/management/email/geckode.com.au/password-check';

        if (value === '') {
            return false
        }

        return window.axios.post(url, { password: value })
            .then(response => {
                let password_strength = parseInt(response.data.strength);
                window.app.password_strength = parseInt(response.data.strength);

                return Promise.resolve({
                    valid: password_strength >= 50
                })
            }).catch(error => {
                return Promise.reject()
            })
    }
});

window.axios = require('axios');

require('./directives/inline-submit.js');

Vue.component('dropdown-menu', require('./components/DropdownMenu.vue'));
Vue.component('ticket-details', require('./components/TicketDetails.vue'));
Vue.component('message-attachments', require('./components/MessageAttachments.vue'));
Vue.component('tab', require('./components/Tab.vue'));
Vue.component('tabs', require('./components/Tabs.vue'));
Vue.component('data-table', require('./components/DataTable.vue'));
Vue.component('modal', require('./components/Modal.vue'));
Vue.component('flash-message', require('./components/FlashMessage.vue'));
Vue.component('invoice', require('./components/Invoice.vue'));


window.onload = function() {
    let notifications = document.getElementsByClassName("notification");

    for (let i = 0; i < notifications.length; i++) {
        let notification = notifications[i];
        let timeout = notification.getAttribute('data-timeout');

        notification.classList.add('is-active');

        if (timeout !== null) {
            timeout = parseInt(timeout);

            setTimeout(() => {
                notification.classList.remove('is-active')
            }, timeout)
        }

        notification.getElementsByClassName('delete')[0].onclick = function (event) {
            event.target.parentNode.classList.remove('is-active')
        }
    }
};

// For "page-wide" events and data, ie. Modals
window.eventbus = new Vue({
    data: {
        modal: {}
    }
});

window.app = new Vue({
    data: {
        accounts: null,
        // Needs to be mapped. Template calls are within a function scope, "fns.apply".
        eventbus: window.eventbus,
        ticket: null,
        tickets: null,
        table_data: null,
        password_strength: 0,

        table_query: '',

        // Vee-validate scopes...
        email_creation_form: {},
        password_change_form: {},
        password_verify_form: {},
        loaded: false,
        users: null
    },
    el: '#app',
    created() {
        if (window.tickets !== undefined) {
            this.tickets = window.tickets
        }

        if (window.ticket !== undefined) {
            this.ticket = window.ticket
        }

        if (window.accounts !== undefined) {
            this.accounts = window.accounts
        }

        if (window.table_data !== undefined) {
            this.table_data = window.table_data
        }

        this.eventbus.$on('delete-ticket', function (data) {
            window.eventbus.$emit('show-modal', {id: 'delete-ticket-modal', ticket: data.id})
        });

        this.eventbus.$on('delete-email', function (data) {
            window.eventbus.$emit('show-modal', {id: 'delete-email-modal', email: data.email})
        });

        this.eventbus.$on('email-options', function (data) {
            window.eventbus.$emit('show-modal', {id: 'email-options-modal', email: data.email})
        });

        this.eventbus.$on('delete-user', function (data) {
            window.eventbus.$emit('show-modal', {
                id: 'delete-user-modal',
                user_id: data.id,
                user_name: data.name
            })
        })
    },
    mounted() {
        this.monkeyPatchConfirmedValidation()
        this.loopUntilLoaded()
    },
    methods: {
        loopUntilLoaded(timeout_limit = 30, timeout_count = 0) {
            this.loaded = this.isFullyLoaded();
            if (!this.loaded && timeout_count < timeout_limit) {
                setTimeout(() => {
                    this.loopUntilLoaded(timeout_limit, timeout_count)
                }, 250);

                timeout_count++
            } else {
                console.log('Vue and components loaded.')
            }
        },

        isFullyLoaded() {
            // Synchronous loop - could be replaced with a promise
            for (let i = this.$children.length - 1; i >= 0; i--) {
                let component = this.$children[i];

                if ('loaded' in component.$data && !component.$data.loaded) {
                    return false
                }

                if (!component._isMounted) {
                    return false
                }
            }

            return true
        },
        monkeyPatchConfirmedValidation() {
            // This is a monkey-patch for the confirmed rule in VeeValidate
            // Allows a scope to be specified on the rule with a "scope.name" rule.

            this.$validator._findFieldInDOM = function _findFieldInDOM (query) {
                let fieldBreakdown, fieldName, scope, field;

                // A dot indicates a scope, unless escaped with a backslash
                if (fieldBreakdown = query.match(/^([^\.\\]+)\.(.*)$/)) {
                    scope = fieldBreakdown[1]
                    fieldName = fieldBreakdown[2]
                } else {
                    scope = '__global__'
                    fieldName = query
                }

                // Unescape any dots
                fieldName = fieldName.replace("\\.", ".");

                if (scope === '__global__') {
                    field = document.querySelector("input[name='" + fieldName + "']")
                } else {
                    field = document.querySelector("[data-vv-scope='" +  scope + "'] input[name='" + fieldName + "']");

                    if (!field) {
                        // Scope may be set on an input directly
                        field = document.querySelector("input[name='" + fieldName + "'][data-vv-scope='" +  scope + "']");
                    }
                }

                return field
            };

            this.$validator.remove('confirmed');
            this.$validator.extend('confirmed', {
                getMessage(field) {
                    return "The " + field + " confirmation does not match."
                },
                validate(value, [confirmedField], validatingField) {
                    // Validator instance was monkey patched, need to use that instance
                    let field = confirmedField
                            ? window.app.$validator._findFieldInDOM(confirmedField)
                            : window.app.$validator._findFieldInDOM(validatingField + '_confirmation')

                    return !! (field && String(value) === field.value)
                }
            })

            // Setup any extra listeners
            // eg. If there is a confirmed validation rule on a 'password_confirmed' field,
            //     apply a input listener on 'password' field.
            Object.keys(this.$validator.$scopes).forEach((scope) => {
                Object.keys(this.$validator.$scopes[scope]).forEach((field) => {
                    Object.keys(this.$validator.$scopes[scope][field].validations).forEach((validationRule) =>{
                        if (validationRule === 'confirmed') {
                            let relatedField;

                            if (this.$validator.$scopes[scope][field].validations[validationRule]) {
                                relatedField = this.$validator._findFieldInDOM(this.$validator.$scopes[scope][field].validations[validationRule][0])
                            } else {
                                relatedField = _findFieldInDOM(scope + '.' + field + '_confirmed')
                            }

                            relatedField.addEventListener("input", () => {
                                this.$validator.validate(field, this.$validator.$scopes[scope][field]['el'].value, scope)
                            })
                        }
                    })
                })
            })
        }
    }
})
