
class SchedgyController < ApplicationController
  
  # Helper functions for Schedgy.
  include ApplicationHelper

  layout 'admin'

  # Displays the schedgy calendar.
  def index
    layout nil
    
    if params['date']
      this_month = Time.parse params['date']
    else
      this_month = Time.now;
    end

    next_month = this_month + 1.month
    prev_month = this_month - 1.month
    
    @prev_month_string = prev_month.strftime('%B %d, %Y')
    @next_month_string = next_month.strftime('%B %d, %Y')
    @this_month_string = this_month.strftime('%B %d, %Y')
    @this_month_short_string = this_month.strftime('%B %Y')
    
  end
  
  def admin
  end
  
  # Sends out the next day's support emails.
  def send_emails
    if request.post?
      tomorrow = Time.now + 1.day
      day = Day.first(:conditions => ['date = ?', tomorrow.strftime('%Y-%m-%d')])

      day.assigned_users.each do |user|
        SupportNotifier.deliver_support_notification(user) # sends the email
      end
    end
  end

  # Returns a list of all the users within the schedy system.
  # 
  # return void returns a JSON payload to the client.
  def list_users
    payload = []
    users = User.all
    users.each do |user|
      payload << user.get_payload
    end
    
    respond_to do |format|
      format.html {render :layout => false, :json => payload}
      format.json {render :layout => false, :json => payload}
    end
  end
  
  # Returns a list of all the tags that can currently be applied
  # to a user.
  #
  # return void returns a JSON payload to the client.
  def list_tags
    payload = []
    
    tags = Tag.all
    tags.each do |tag|
      payload << tag.text
    end
    
    respond_to do |format|
      format.html {render :layout => false, :json => payload}
      format.json {render :layout => false, :json => payload}
    end
  end
  
  # Returns a list of all the role names within the schedgy system.
  # 
  # return void renders a JSON payload of role names for the client.
  def list_role_type_names
    role_type_names = RoleType.all.map(&:name)
    
    respond_to do |format|
      format.html {render :layout => false, :json => role_type_names}
      format.json {render :layout => false, :json => role_type_names}
    end
  end
  
  # Returns a list of days for a given month.
  # @param params['time'] = a ruby timestamp representing the day of the month.
  # @return void returns day serialized day objects to the client.
  def list_days
    payload = []
    
    # Based on the timestamp in fetch all this month's days.
    time = Time.at params['time'].to_i
    days = Day.find(:all, :conditions => ['date like ?', time.strftime('%Y-%m') + '%'])
    
    days.each do |day|
      payload << day.get_payload
    end
    
    respond_to do |format|
      format.html {render :layout => false, :json => payload}
      format.json {render :layout => false, :json => payload}
    end
  end
  
  # Removes a user from working on a specific day of the month
  # @param params['time'] a timestamp used to lookup the day the user is working on.
  # @return void
  def remove_user_from_day
    payload = {}
    
    if session[:level] == 2 # Make sure this is an admin user.
      
      # Extract email and time from post parameters.
      email = params['email']
      time = Time.at params['time'].to_i

      # find or create a given day.
      day = Day.first(:conditions => ['date = ?', time.strftime('%Y-%m-%d')])
      user = User.first(:conditions => ['email = ?', email])
        
      # If a user isn't assigned to this day assign them to it.
      day.assigned_users.delete(user)

    else
      payload[:error] = I18n.t(:permission_error)
    end

    respond_to do |format|
      format.html {render :layout => false, :json => payload}
      format.json {render :layout => false, :json => payload}
    end
    
  end
  
  # Assigns a tag to a user on a specific day.
  def add_tag_to_user
    payload = {}
    
    if session[:level] == 2 # Make sure this is an admin user.      
      # Extract email and time from post parameters.
      email = params['email']
      time = Time.at params['time'].to_i

      # find or create a given day.
      day = Day.first(:conditions => ['date = ?', time.strftime('%Y-%m-%d')])
      user = User.first(:conditions => ['email = ?', email])
      tag = Tag.first(:conditions => ['text = ?', params['tag']])
      
      day.assignments.each do |assignment|
        if assignment.user_id == user.id
          assignment.applied_tags << tag
        end
      end
      
    else
      payload[:error] = I18n.t(:permission_error)
    end
    
    
    respond_to do |format|
      format.html {render :layout => false, :json => payload}
      format.json {render :layout => false, :json => payload}
    end
  end
  
  # Remove a tag from a user on a specific day.
  def remove_tag_from_user
    payload = {}
    
    if session[:level] == 2 # Make sure this is an admin user.      
      # Extract email and time from post parameters.
      email = params['email']
      time = Time.at params['time'].to_i

      # find or create a given day.
      day = Day.first(:conditions => ['date = ?', time.strftime('%Y-%m-%d')])
      user = User.first(:conditions => ['email = ?', email])
      
      day.assignments.each do |assignment|
        assignment.applied_tags.each do |tag|
          if assignment.user_id == user.id && tag.text == params['tag']
            assignment.applied_tags.delete(tag)
          end
        end
      end
      
    else
      payload[:error] = I18n.t(:permission_error)
    end
    
    
    respond_to do |format|
      format.html {render :layout => false, :json => payload}
      format.json {render :layout => false, :json => payload}
    end
  end
  
  # Given a timestamp and an email adds a user to a given day of the month.
  # @param params['email'] the email address of the user to assign.
  # @param params['time'] the timestamp used to lookup the day.
  def add_user_to_day
    
    payload = {}
    
    if session[:level] == 2 # Make sure this is an admin user.      
      # Extract email and time from post parameters.
      email = params['email']
      time = Time.at params['time'].to_i

      # find or create a given day.
      day = Day.first(:conditions => ['date = ?', time.strftime('%Y-%m-%d')])
      user = User.first(:conditions => ['email = ?', email])
    
      # Make sure the day exists.
      day = Day.create({
        :date => time,
        :required_user_count => 5,
      }) unless day
    
      # Make sure we can in fact assign this user to the day.
      # If a user isn't assigned to this day assign them to it.
      unless day.assigned_users.first(:conditions => ['email = ?', email])   

        if day.can_assign? user
            day.assigned_users << user
            day.save
        
            # Update the assignment object to indicate the type of 
            # assignment that just took place, e.g., 'any'.
        
            assignment = Assignment.first(:conditions => ['day_id = ? AND user_id = ?', day.id, user.id])
            assignment.assignment_type = day.assigned_as
            assignment.save
        
            payload[:message] = 'User assigned to day.'
        else
          payload[:error] = day.error
        end
      
      else
        payload[:error] = 'User already assigned to this day.'
      end
      
    else
      payload[:error] = I18n.t(:permission_error)
    end
    
    
    respond_to do |format|
      format.html {render :layout => false, :json => payload}
      format.json {render :layout => false, :json => payload}
    end
  end
  
  # Creates a new role based on the params passed in from a form.
  # @param params form parameters for creating a new role.
  def create_role_type
    
    if session[:level] == 2 # Make sure this is an admin user.
          
      # Reset flash messages.
      flash[:error] = false
      @role_type = nil
    
      # If the role_type parameter is set create a new role.
      if params['role_type']
        @role_type = RoleType.create(params['role_type'])
      end
    else
      flash[:error] = I18n.t(:permission_error)
    end
    
  end
  
  # Create a new tag that can be assigned when adding a user
  # to a day.
  # @param params form parameters for creating a new tag.
  def create_tag
    
    if session[:level] == 2 # Make sure this is an admin user.
          
      # Reset flash messages.
      flash[:error] = false
      @tag = nil
    
      # If the role_type parameter is set create a new role.
      if params['tag']
        @tag = Tag.create(params['tag'])
      end
      
    else
      flash[:error] = I18n.t(:permission_error)
    end
    
  end
  
  # Allow a user to login to schedgy.
  def login
    @user = nil

    # Reset flash messages.
    flash[:error] = false
    
    if params['user']
      params['user']['password'] = Digest::MD5.hexdigest("#{self.salt}#{params['user']['password']}")
      user = User.first(:conditions => ['password = ? AND email = ?', params['user']['password'], params['user']['email']])
      
      # User logged in.
      if user
        flash[:message] = "User #{params['user']['email']} logged in."
        session[:level] = user.level
        session[:email] = user.email
        redirect_to :controller => 'schedgy', :action => 'admin'
      else
        flash[:error] = 'Username or password incorrect.'
      end
    end
    
  end
  
  # Allow a user to change their password.
  def change_password
    @user = nil

    # Reset flash messages.
    flash[:error] = false
    
    if params['user']
      params['user']['password'] = Digest::MD5.hexdigest("#{self.salt}#{params['user']['password']}")
      user = User.first(:conditions => ['password = ? AND email = ?', params['user']['password'], params['user']['email']])
      
      # User logged in.
      if user
        password_1 =  Digest::MD5.hexdigest("#{self.salt}#{params['new_password']}")
        password_2 =  Digest::MD5.hexdigest("#{self.salt}#{params['retype_new_password']}")
        
        if password_1 == password_2
          user.password = password_1
          user.save
          flash[:message] = "User #{params['user']['email']} password changed."
        else
          flash[:error] = 'Passwords did not match.'
        end
        
      else
        flash[:error] = 'Could not change password, old username or password incorrect.'
      end
    end
    
  end
  
  # Create a new user based on the params passed in from a form.
  # @param parameters from form.
  def create_user
    @user = nil

    # Reset flash messages.
    flash[:error] = false

    # User level select options.
    @user_levels = {
      'Regular User' => '1',
      'Admin User' => '2'
    }

    # You must be logged in as an admin to create users, or this
    # must be the first user being created.
    can_create_user = false
    
    if User.find(:all).length == 0
      can_create_user = true # Creating the first user.
    elsif session[:level] == 2
      can_create_user = true # Logged in as admin.
    end
      
    if can_create_user
    
      # If the role_type parameter is set create a new role.
      if params['user']
        # Hash the user's password before saving.
        params['user']['password'] = Digest::MD5.hexdigest("#{self.salt}#{params['user']['password']}")
        User.create(params['user'])
      end
    
    else
      flash[:error] = I18n.t(:permission_error)
    end
    
  end
  
  # Assigns a user to a role.
  # @param params['role_type']['name']
  # @param params['user']['email']
  # return void user's role is set to the role provided.
  def assign_user_to_role
    
    @role_type_names = RoleType.all.map(&:name)
    @user_emails = User.all.map(&:email)
     
    if session[:level] == 2 # Make sure this is an admin user.
      if params['role_type'] && params['user']
        # Save the role to the user.
        @user = User.first(:conditions => ['email = ?', params['user']['email']])
        @role_type = RoleType.first(:conditions => ['name = ?', params['role_type']['name']])
        @user.role_types.clear
        unless @role_type.nil?
          @user.role_types << @role_type
          @user.save
        end
      end
    else
      flash[:error] = I18n.t(:permission_error)
    end
    
  end
  
  # Add restrictions and requirements to a given day.
  # @param params['restrictions'][0 - N]
  # @param params['requirements'][0 - N]
  # return void Sets up the requirements on a given day, in terms of staff allotments.
  def set_day_requirements_and_restrictions
    # Apply ACL.
    if session[:level] == 2 # Make sure this is an admin user.
    
      requirements = params['requirements'] ||= {}
      restrictions = params['restrictions'] ||= {}
      time = Time.at params['time'].to_i
    
      payload = {
        :restrictions => restrictions,
        :requirements => requirements,
        :time => params['time']
      }
    
      # find or create a given day.
      day = Day.first(:conditions => ['date = ?', time.strftime('%Y-%m-%d')])
    
      # Make sure the day exists.
      day = Day.create({
        :date => time
      }) unless day
    
      # Remove any existing restrictions or requirements.
      day.required_role_types.clear
      day.restricted_role_types.clear
    
      # Copy requirements onto the day.
      requirements.each do |k, v| # Add required role relationships to the day.
        if k == 'any' # If given the any flag, set the day's 'required_user_count'.
          day.required_user_count = v;
        else # Otherwise we create the appropriate relationship objects.
          role_type = RoleType.first(:conditions => ['name = ?', k])
          day.required_role_types << role_type
          day.save
        
          day.required_roles.each do |required_role|
            if required_role.role_type_id == role_type.id
              required_role.count = v
              required_role.save
            end
          end
        end
      end
    
      # Copy restrictions onto the day.
      day.save
      restrictions.each do |k, v| # Add required role relationships to the day.
        role_type = RoleType.first(:conditions => ['name = ?', v])
        if role_type
          day.restricted_role_types << role_type
          day.save
        end
      end
    
    else
      payload = {
       :error => I18n.t(:permission_error)
      }
    end

    respond_to do |format|
      format.html {render :layout => false, :json => payload}
      format.json {render :layout => false, :json => payload}
    end
    
  end
  
end
