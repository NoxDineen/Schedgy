class CreateRoleRestrictions < ActiveRecord::Migration
  def self.up
    create_table :role_restrictions do |t|
      t.integer :day_id
      t.integer :role_type_id
      t.string :description
      t.timestamps
    end
  end

  def self.down
    drop_table :role_restrictions
  end
end
