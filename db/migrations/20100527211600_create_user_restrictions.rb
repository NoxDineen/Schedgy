class CreateUserRestrictions < ActiveRecord::Migration
  def self.up
    create_table :user_restrictions do |t|
      t.string :description
      t.integer :user_id
      t.integer :day_id
      t.timestamps
    end
  end

  def self.down
    drop_table :user_restrictions
  end
end
