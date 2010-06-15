class CreateAssignments < ActiveRecord::Migration
  def self.up
    create_table :assignments do |t|
      t.integer :user_id
      t.integer :day_id
      t.string :assignment_type
      t.timestamps
    end
  end

  def self.down
    drop_table :assignees
  end
end
