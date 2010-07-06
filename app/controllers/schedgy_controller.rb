class SchedgyController < ApplicationController
  def index
  end
  
  # Returns a list of all the users within the schedy system.
  # 
  # return void renders a JSON payload to the client.
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
    
    # Extract email and time from post parameters.
    email = params['email']
    time = Time.at params['time'].to_i

    # find or create a given day.
    day = Day.first(:conditions => ['date = ?', time.strftime('%Y-%m-%d')])
    user = User.first(:conditions => ['email = ?', email])
        
    # If a user isn't assigned to this day assign them to it.
    day.assigned_users.delete(user)

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
    
    respond_to do |format|
      format.html {render :layout => false, :json => payload}
      format.json {render :layout => false, :json => payload}
    end
  end
  
  # Creates a new role based on the params passed in from a form.
  # @param params form parameters for creating a new role.
  def create_role_type
    # Reset flash messages.
    flash[:error] = false
    @role_type = nil
    
    # If the role_type parameter is set create a new role.
    if params['role_type']
      @role_type = RoleType.create(params['role_type'])
    end
    
  end
  
  # Create a new user based on the params passed in from a form.
  # @param parameters from form.
  def create_user
    # Reset flash messages.
    flash[:error] = false
    @user = nil
    @user_levels = {
      'Regular User' => '1',
      'Admin User' => '2'
    }
    
    # If the role_type parameter is set create a new role.
    if params['user']
      @user = User.create(params['user'])
    end
  end
  
  # Assigns a user to a role.
  # @param params['role_type']['name']
  # @param params['user']['email']
  # return void user's role is set to the role provided.
  def assign_user_to_role
    @role_type_names = RoleType.all.map(&:name)
    @user_emails = User.all.map(&:email)
    
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
  end
  
  # Add restrictions and requirements to a given day.
  # @param params['restrictions'][0 - N]
  # @param params['requirements'][0 - N]
  # return void Sets up the requirements on a given day, in terms of staff allotments.
  def set_day_requirements_and_restrictions
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
    
    respond_to do |format|
      format.html {render :layout => false, :json => payload}
      format.json {render :layout => false, :json => payload}
    end
  end
  
end
