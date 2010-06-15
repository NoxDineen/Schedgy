class Day < ActiveRecord::Base
  has_many :assignments
  has_many :assigned_users, :through => :assignments, :source => :user

  has_many :user_restrictions
  has_many :restricted_users, :through => :user_restrictions, :source => :user

  has_many :role_restrictions
  has_many :restricted_role_types, :through => :role_restrictions, :source => :role_type

  has_many :required_roles
  has_many :required_role_types, :through => :required_roles, :source => :role_type
  
  # override default to_json
  def get_payload
    payload = {
      :day => self.date.strftime('%b %d, %Y'),
      :assigned_users => [],
      :required_roles => [],
      :restricted_roles => [],
      :required_user_count => self.required_user_count
    }
    
    self.restricted_role_types.each do |role_type|
      payload[:restricted_roles] << role_type.name
    end
    
    self.required_roles.each do |required_role|
      role_type = required_role.role_type
      tmp_struct = {
        :count => required_role.count,
        :name => role_type.name
      }
      payload[:required_roles] << tmp_struct
    end
    
    assigned_users.each do |user|
      payload[:assigned_users] << user.get_payload
    end
    
    payload
  end
end
