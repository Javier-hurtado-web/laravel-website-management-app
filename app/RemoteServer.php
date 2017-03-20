<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use App\Facades\WHMApi;

class RemoteServer extends Model
{
    /**
     * List of model fields acceptable to mass-assignment by Eloquent.
     *
     * @var array
     */
    protected $fillable = ['uid', 'domain', 'username', 'plan-name',
                           'max-emails', 'disk-used', 'disk-limit', 'active'];

    /**
     * List of domains to never be stored or be manipulated by the system.
     *
     * @var array
     */
    protected static $ignore_servers = [
        '***REMOVED***',
        '***REMOVED***',
        '***REMOVED***',
        '***REMOVED***',
        '***REMOVED***',
        '***REMOVED***',
        '***REMOVED***'
    ];

    /**
     * Downloads a list of the current accounts on the web hosting server.
     *
     * Run as a artisan command or job, so error exceptions are allowed.
     */
    public static function updateServerList()
    {
        $accounts = WHMApi::accountList();

        foreach ($accounts as $index => $account) {
            if (in_array($account->domain, RemoteServer::$ignore_servers)) {
                continue;
            }

            RemoteServer::updateOrCreate(
                ['uid' => $account->uid],
                [
                'uid' => $account->uid,
                'domain' => $account->domain,
                'username'  => $account->user,
                'plan-name' => $account->plan,
                'max-emails' => $account->maxpop,
                'disk-used' => preg_replace('[\D]', '', $account->diskused),
                'disk-limit' => preg_replace('[\D]', '', $account->disklimit),
                'active' => ($account->suspended == 0)
                ]
            );
        }
    }

    /**
     * Searches the database for the user belonging to a domain.
     *
     * CPanel's API requires a matching domain and user to perform most commands.
     *
     * @param string $domain the domain to lookup
     *
     * @return string the username associated with the domain.
     *                FALSE if domain is non-existent.
     */
    public static function getUserByDomain($domain)
    {
        $server = RemoteServer::where('domain', $domain)->first();

        if ($server) {
            return $server->username;
        }

        return false;
    }

    /**
     * Create an email account.
     *
     * @param string email username, ie. user
     * @param string account password
     * @param string domain
     * @param string account quota in MB
     *
     * @return boolean|array
     */
    public static function createEmail($email, $password, $domain, $quota = 2048)
    {
        $cpanel_user = self::getUserByDomain($domain);

        $result = WHMApi::emailCreateAccount($cpanel_user, $email, $password, $domain, $quota);

        return $result;
    }

    /**
     * Delete an email account.
     *
     * @param string email username, ie. user
     * @param string domain
     *
     * @return boolean|array
     */
    public static function deleteEmail($email_username, $domain)
    {
        $cpanel_user = self::getUserByDomain($domain);

        $result = WHMApi::emailDeleteAccount($cpanel_user, $email_username, $domain);

        return $result;
    }

    /**
     * Downloads a list of the current emails for a given domain.
     *
     * @param string the domain's email accounts to look up
     */
    public function emailList($domain)
    {
        $username = $this->getUserByDomain($domain);

        return ['domain' => $domain,
                'username' => $username,
                'accounts' => WHMApi::emailList($username, $domain)];
    }


    public static function emailPasswordStrength($password)
    {
        return [
            'strength' => WHMApi::emailPasswordStrength($password)
        ];
    }

    public static function emailChangePassword($email, $password)
    {
        list($username, $domain) = explode('@', $email);

        return [
            'status' => WHMApi::emailChangePassword($username, $password, $domain)
        ];
    }
}
