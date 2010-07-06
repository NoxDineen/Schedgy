# Be sure to restart your server when you modify this file.

# Your secret key for verifying cookie session data integrity.
# If you change this key, all old sessions will become invalid!
# Make sure the secret is at least 30 characters and all random, 
# no regular words or you'll be exposed to dictionary attacks.
ActionController::Base.session = {
  :key         => '_schedgy_session',
  :secret      => '944b3dd15989040101802e1e83642a9119523c748e73852be61f0da0fdba086fd54d01fa72a16f3f3e32e4a219a8aa3743a7901b15d52dca9966268f7d26cec5'
}

# Use the database for sessions instead of the cookie-based default,
# which shouldn't be used to store highly confidential information
# (create the session table with "rake db:sessions:create")
# ActionController::Base.session_store = :active_record_store
