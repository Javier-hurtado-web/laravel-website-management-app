<modal id="new-email-modal" v-cloak>
    <section>
        <h3>New account</h3>
    </section>

    <form v-inline-submit method="post" autocomplete="off"
          action="{{ route('server_email.store', ['remoteserver' => $domain]) }}"  data-vv-scope="email_creation_form"
          data-redirect-on-success="{{ route('server_email.index', ['remoteserver' => $domain]) }}">
        {{ csrf_field() }}

        @include('partials/form-status-indicator')

        <input name="domain" class="input" type="hidden" value="{{ $domain }}">

        <div class="control">
            <label class="control-label">Email</label>

            <p class="control is-grouped">
                <input name="username" class="input" type="text" style="max-width: 300px" v-validate="'required'">
                
                <span style="display: inline-block; font-weight: bold; font-size: 1.1em; line-height: 2em; margin-left: .2em">
                    {{ '@'. $domain }}
                </span>

                <div v-show="errors.has('email_creation_form.username')" class="help is-danger" v-cloak style="clear: both; width: 100%">
                    @{{ errors.first('email_creation_form.username') }}
                </div>
            </p>
        </div>
        <div class="columns">
            <div class="column">
                <div class="control">
                    <label class="control-label">Password</label>

                    <input name="password" class="input" type="password" v-validate="'required|cpanel_verify'"
                           data-vv-delay="500" :class="{ 'is-danger': errors.has('email_creation_form.password') }"
                           v-model="email_creation_form.password" id="new-email-password">

                    <span v-show="errors.has('email_creation_form.password')" class="help is-danger" v-cloak>
                        Score: @{{ password_strength }} / 50 -
                        @{{ errors.first('email_creation_form.password') }}
                    </span>
                </div>

                <div class="control">
                    <label class="control-label">Confirm password</label>

                    <p class="control">
                        <input name="password_confirmation" type="password" class="input"
                               :class="{ 'is-danger': errors.has('email_creation_form.password_confirmation') }"
                               v-validate="'confirmed:#new-email-password'">

                        <span v-show="errors.has('email_creation_form.password_confirmation')" class="help is-danger" v-cloak>
                            The password confirmation does not match the original password.
                        </span>
                    </p>
                </div>
            </div>

            <div class="column is-5">
                <div class="message is-info">
                    <p class="message-body">
                        The server requires a password with mixed-case letters and symbols, avoiding common words where possible.
                    </p>
                </div>
            </div>
        </div>

        <div class="control is-grouped">
            <p class="control">
                <button type="submit" class="button is-primary">Create account</button>
            </p>

            <p class="control">
                <button type="button" class="button" @click="eventbus.$emit('hide-modal', 'new-email-modal')">Cancel</button>
            </p>
        </div>
    </form>
</modal>