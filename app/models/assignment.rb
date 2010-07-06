class Assignment < ActiveRecord::Base
  belongs_to :user
  
  has_many :assignment_has_tag
  has_many :applied_tags, :through => :assignment_has_tag, :source => :tag
end
