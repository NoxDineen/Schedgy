require 'icalendar'

class IcalController < ApplicationController
  include Icalendar

  def index
    # begin
      if params['date']
        this_month = Time.parse params['date']
      else
        this_month = Time.now;
      end
    
      if params['email']
        users = User.find(:all, :conditions => {:email => params['email']})
      else
        users = User.find(:all)
      end
      
      if params['alarms']
        alarms = 'true' == params['alarms'].downcase
      else
        alarms = true
      end
      
      start_month = this_month - 1.month
      end_month = this_month + 3.months

      days = Day.find(:all, :conditions => {:date => start_month..end_month})
    
      calendar = Calendar.new
      days.each do |day|
        day.assigned_users.select {|u| users.include? u}.each do |user|
          calendar.event do
            dtstart day.date
            dtend day.date
            summary "#{user.first_name} #{user.last_name} is on support"
            add_attendee user.email
            
            if alarms
              alarm do
                summary "#{user.first_name} #{user.last_name} is on support"
                trigger "-PT15H"
              end
            end
          end
        end
      end
    
      render :status => 200, :content_type => "text/plain",
             :text => calendar.to_ical
    # rescue ActiveRecord::RecordNotFound
    #   render :status => 404, :content_type => "text/plain",
    #          :text => "No user #{params['user']} found."
    # end
  end
end
