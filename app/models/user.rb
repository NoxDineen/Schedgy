class User < ActiveRecord::Base
  
  # Relationships.
  has_many :roles
  has_many :role_types, :through => :roles
  
  # Validation.
  validates_uniqueness_of :email
  validates_format_of :email, :with => /\A([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})\Z/i, :on => :create
  validates_length_of :email, :in => 1..50
  validates_length_of :first_name, :in => 1..50
  validates_length_of :last_name, :in => 1..50
      
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
