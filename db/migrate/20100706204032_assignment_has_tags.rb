class AssignmentHasTags < ActiveRecord::Migration
  def self.up
    create_table :assignment_has_tags do |t|
      t.integer :assignment_id
      t.integer :tag_id
      t.timestamps
    end
  end

  def self.down
    drop_table :assignment_has_tags
  end
end