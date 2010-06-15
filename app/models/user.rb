class User < ActiveRecord::Base
  def get_payload
    return_me = {
      :first_name => self.first_name,
      :last_name => self.last_name,
      :email => self.email
    }
    
    return return_me
  end
end
