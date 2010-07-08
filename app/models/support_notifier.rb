class SupportNotifier < ActionMailer::Base
  def support_notification recipient
    puts recipient.email
      
    recipients recipient.email
    from       "schedgy@freshbooks.com"
    headers "Reply-to schedgy@freshbooks.com"
    sent_on Time.now
    subject    "You're on support tomorrow!"
    body       :first_name => recipient.first_name
  end
end
