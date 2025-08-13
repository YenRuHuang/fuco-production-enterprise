-- FUCO Production System Database Schema
-- PostgreSQL Database Migration

-- ========================================
-- 1. 用戶管理表
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    department VARCHAR(100),
    role VARCHAR(50) DEFAULT 'operator',
    email VARCHAR(255),
    phone VARCHAR(50),
    workstation_permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    CONSTRAINT chk_role CHECK (role IN ('admin', 'supervisor', 'operator', 'viewer'))
);

CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_department ON users(department);

-- ========================================
-- 2. 工作站表
-- ========================================
CREATE TABLE IF NOT EXISTS workstations (
    id SERIAL PRIMARY KEY,
    station_code VARCHAR(10) UNIQUE NOT NULL,
    station_name VARCHAR(100) NOT NULL,
    station_type VARCHAR(50),
    location VARCHAR(200),
    capacity INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'idle',
    current_operator_id INTEGER REFERENCES users(id),
    current_work_order_id INTEGER,
    equipment_list JSONB DEFAULT '[]'::jsonb,
    configuration JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    maintenance_status VARCHAR(50) DEFAULT 'normal',
    last_maintenance_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_status CHECK (status IN ('idle', 'working', 'maintenance', 'offline'))
);

CREATE INDEX idx_workstations_code ON workstations(station_code);
CREATE INDEX idx_workstations_status ON workstations(status);

-- ========================================
-- 3. 製令（工單）表
-- ========================================
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    parent_part_number VARCHAR(100) NOT NULL,
    product_code VARCHAR(100),
    product_name VARCHAR(200),
    model_name VARCHAR(200),
    planned_quantity INTEGER NOT NULL,
    completed_quantity INTEGER DEFAULT 0,
    defect_quantity INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    customer_name VARCHAR(200),
    customer_order_number VARCHAR(100),
    planned_start_date TIMESTAMP,
    planned_end_date TIMESTAMP,
    actual_start_date TIMESTAMP,
    actual_end_date TIMESTAMP,
    bom_id INTEGER,
    sop_document_path VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    CONSTRAINT chk_wo_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold'))
);

CREATE INDEX idx_work_orders_number ON work_orders(order_number);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_product ON work_orders(product_code);

-- ========================================
-- 4. 生產記錄表
-- ========================================
CREATE TABLE IF NOT EXISTS production_records (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL REFERENCES work_orders(id),
    workstation_id INTEGER NOT NULL REFERENCES workstations(id),
    operator_id INTEGER NOT NULL REFERENCES users(id),
    equipment_id VARCHAR(100),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    good_quantity INTEGER DEFAULT 0,
    defect_quantity INTEGER DEFAULT 0,
    scrap_quantity INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_progress',
    pause_count INTEGER DEFAULT 0,
    total_pause_minutes INTEGER DEFAULT 0,
    shift VARCHAR(20),
    production_data JSONB DEFAULT '{}'::jsonb,
    quality_check_data JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pr_status CHECK (status IN ('in_progress', 'completed', 'paused', 'cancelled'))
);

CREATE INDEX idx_production_records_wo ON production_records(work_order_id);
CREATE INDEX idx_production_records_ws ON production_records(workstation_id);
CREATE INDEX idx_production_records_operator ON production_records(operator_id);
CREATE INDEX idx_production_records_time ON production_records(start_time, end_time);

-- ========================================
-- 5. 設備表
-- ========================================
CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    equipment_code VARCHAR(50) UNIQUE NOT NULL,
    equipment_name VARCHAR(200) NOT NULL,
    equipment_type VARCHAR(100),
    manufacturer VARCHAR(200),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    workstation_id INTEGER REFERENCES workstations(id),
    status VARCHAR(50) DEFAULT 'available',
    purchase_date DATE,
    warranty_expiry DATE,
    maintenance_cycle_days INTEGER,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    usage_hours DECIMAL(10,2) DEFAULT 0,
    specifications JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_eq_status CHECK (status IN ('available', 'in_use', 'maintenance', 'repair', 'retired'))
);

CREATE INDEX idx_equipment_code ON equipment(equipment_code);
CREATE INDEX idx_equipment_workstation ON equipment(workstation_id);
CREATE INDEX idx_equipment_status ON equipment(status);

-- ========================================
-- 6. 不良品記錄表
-- ========================================
CREATE TABLE IF NOT EXISTS defect_records (
    id SERIAL PRIMARY KEY,
    production_record_id INTEGER REFERENCES production_records(id),
    work_order_id INTEGER REFERENCES work_orders(id),
    workstation_id INTEGER REFERENCES workstations(id),
    operator_id INTEGER REFERENCES users(id),
    defect_code VARCHAR(50),
    defect_type VARCHAR(100),
    defect_description TEXT,
    quantity INTEGER DEFAULT 1,
    severity VARCHAR(20) DEFAULT 'minor',
    is_repairable BOOLEAN DEFAULT false,
    repair_status VARCHAR(50),
    repair_operator_id INTEGER REFERENCES users(id),
    repair_time TIMESTAMP,
    repair_notes TEXT,
    root_cause TEXT,
    corrective_action TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_severity CHECK (severity IN ('critical', 'major', 'minor')),
    CONSTRAINT chk_repair_status CHECK (repair_status IN ('pending', 'in_repair', 'repaired', 'scrapped'))
);

CREATE INDEX idx_defect_records_pr ON defect_records(production_record_id);
CREATE INDEX idx_defect_records_wo ON defect_records(work_order_id);
CREATE INDEX idx_defect_records_type ON defect_records(defect_type);

-- ========================================
-- 7. BOM（物料清單）表
-- ========================================
CREATE TABLE IF NOT EXISTS bom_master (
    id SERIAL PRIMARY KEY,
    bom_number VARCHAR(100) UNIQUE NOT NULL,
    parent_part_number VARCHAR(100) NOT NULL,
    product_name VARCHAR(200),
    version VARCHAR(20) DEFAULT '1.0',
    status VARCHAR(50) DEFAULT 'active',
    effective_date DATE,
    expiry_date DATE,
    total_components INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_date TIMESTAMP,
    CONSTRAINT chk_bom_status CHECK (status IN ('draft', 'active', 'inactive', 'obsolete'))
);

CREATE INDEX idx_bom_master_number ON bom_master(bom_number);
CREATE INDEX idx_bom_master_parent ON bom_master(parent_part_number);

-- ========================================
-- 8. BOM 明細表
-- ========================================
CREATE TABLE IF NOT EXISTS bom_details (
    id SERIAL PRIMARY KEY,
    bom_id INTEGER NOT NULL REFERENCES bom_master(id) ON DELETE CASCADE,
    component_part_number VARCHAR(100) NOT NULL,
    component_name VARCHAR(200),
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) DEFAULT 'PCS',
    component_type VARCHAR(50),
    supplier VARCHAR(200),
    lead_time_days INTEGER,
    cost_per_unit DECIMAL(10,2),
    specifications JSONB DEFAULT '{}'::jsonb,
    is_critical BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bom_details_bom ON bom_details(bom_id);
CREATE INDEX idx_bom_details_component ON bom_details(component_part_number);

-- ========================================
-- 9. 領料單表
-- ========================================
CREATE TABLE IF NOT EXISTS material_requisitions (
    id SERIAL PRIMARY KEY,
    requisition_number VARCHAR(100) UNIQUE NOT NULL,
    work_order_id INTEGER REFERENCES work_orders(id),
    workstation_id INTEGER REFERENCES workstations(id),
    requested_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    required_date TIMESTAMP,
    issued_date TIMESTAMP,
    total_items INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_mr_status CHECK (status IN ('pending', 'approved', 'issued', 'partial', 'cancelled'))
);

CREATE INDEX idx_material_requisitions_number ON material_requisitions(requisition_number);
CREATE INDEX idx_material_requisitions_wo ON material_requisitions(work_order_id);

-- ========================================
-- 10. 領料單明細表
-- ========================================
CREATE TABLE IF NOT EXISTS material_requisition_details (
    id SERIAL PRIMARY KEY,
    requisition_id INTEGER NOT NULL REFERENCES material_requisitions(id) ON DELETE CASCADE,
    part_number VARCHAR(100) NOT NULL,
    part_name VARCHAR(200),
    requested_quantity DECIMAL(10,3) NOT NULL,
    issued_quantity DECIMAL(10,3) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'PCS',
    warehouse_location VARCHAR(100),
    batch_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mrd_requisition ON material_requisition_details(requisition_id);
CREATE INDEX idx_mrd_part ON material_requisition_details(part_number);

-- ========================================
-- 11. SOP 文件表
-- ========================================
CREATE TABLE IF NOT EXISTS sop_documents (
    id SERIAL PRIMARY KEY,
    document_number VARCHAR(100) UNIQUE NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    product_code VARCHAR(100),
    workstation_id INTEGER REFERENCES workstations(id),
    version VARCHAR(20) DEFAULT '1.0',
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    effective_date DATE,
    expiry_date DATE,
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_date TIMESTAMP,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sop_status CHECK (status IN ('draft', 'active', 'inactive', 'obsolete'))
);

CREATE INDEX idx_sop_documents_number ON sop_documents(document_number);
CREATE INDEX idx_sop_documents_product ON sop_documents(product_code);
CREATE INDEX idx_sop_documents_workstation ON sop_documents(workstation_id);

-- ========================================
-- 12. 系統日誌表
-- ========================================
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    action_description TEXT,
    target_table VARCHAR(50),
    target_id INTEGER,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_logs_user ON system_logs(user_id);
CREATE INDEX idx_system_logs_action ON system_logs(action_type);
CREATE INDEX idx_system_logs_time ON system_logs(created_at);
CREATE INDEX idx_system_logs_target ON system_logs(target_table, target_id);

-- ========================================
-- 觸發器：自動更新 updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為所有需要的表創建觸發器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workstations_updated_at BEFORE UPDATE ON workstations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_records_updated_at BEFORE UPDATE ON production_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_defect_records_updated_at BEFORE UPDATE ON defect_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bom_master_updated_at BEFORE UPDATE ON bom_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_requisitions_updated_at BEFORE UPDATE ON material_requisitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_documents_updated_at BEFORE UPDATE ON sop_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 初始管理員帳號
-- ========================================
INSERT INTO users (employee_id, username, password_hash, full_name, role, email)
VALUES ('ADMIN001', 'admin', '$2a$10$YourHashedPasswordHere', 'System Administrator', 'admin', 'admin@fuco.com')
ON CONFLICT (username) DO NOTHING;
