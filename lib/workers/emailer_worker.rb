class EmailerWorker < BackgrounDRb::MetaWorker
  set_worker_name :emailer_worker
  
  def create(args = nil)
    add_periodic_timer(1.day) {
      update
    }
  end
  
  def update
    
    begin
      
      tomorrow = Time.now + 1.day
      day = Day.first(:conditions => ['date = ?', tomorrow.strftime('%Y-%m-%d')])

      day.assigned_users.each do |user|
        SupportNotifier.deliver_support_notification(user) # sends the email
      end
      
    rescue Exception => e
    end
  end
end