class EmailerWorker < BackgrounDRb::MetaWorker
  set_worker_name :emailer_worker
  
  def create(args = nil)
    add_periodic_timer(2.seconds) {
      update
    }
  end
  
  def update
    days = Day.find(:all)
    puts 'A COUNT ' + days.length.to_s
  end
end

