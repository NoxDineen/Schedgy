class CreateRequiredRoles < ActiveRecord::Migration
  def self.up
    create_table :required_roles do |t|
      t.integer :count
      t.integer :role_type_id
      t.integer :day_id
      t.timestamps
    end
  end

  def self.down
    drop_table :required_roles
  end
end
