class CreateDays < ActiveRecord::Migration
  def self.up
    create_table :days do |t|
      t.date :date
      t.integer :required_user_count
      t.timestamps
    end
  end

  def self.down
    drop_table :days
  end
end
