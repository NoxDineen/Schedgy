class User < ActiveRecord::Base
  has_many :roles
  has_many :role_types, :through => :roles
    
  def get_payload
    return_me = {
      :first_name => self.first_name,
      :last_name => self.last_name,
      :email => self.email,
      :roles => []
    }

    self.role_types.each do |role_type|
      return_me[:roles] << role_type.name
    end
    
    return return_me
  end
end
