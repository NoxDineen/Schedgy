class RoleType < ActiveRecord::Base
  # Validators.
  validates_uniqueness_of :name
  validates_length_of :name, :in => 1..50
end