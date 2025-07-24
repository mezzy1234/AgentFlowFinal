-- Edge Case Handling System Schema
-- Handles system failures, error recovery, monitoring, and unusual scenarios

-- System Health Monitoring
CREATE TABLE system_health_metrics (
    id VARCHAR PRIMARY KEY,
    metric_type VARCHAR NOT NULL, -- cpu, memory, disk, database, api_latency, queue_depth
    metric_name VARCHAR NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR DEFAULT 'count', -- percent, milliseconds, bytes, count
    threshold_warning DECIMAL(15,6),
    threshold_critical DECIMAL(15,6),
    status VARCHAR DEFAULT 'normal', -- normal, warning, critical
    
    -- Context
    service_name VARCHAR, -- api, worker, database, cache
    instance_id VARCHAR, -- Server/container instance
    region VARCHAR DEFAULT 'us-east-1',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    measured_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Error Tracking and Recovery
CREATE TABLE error_incidents (
    id VARCHAR PRIMARY KEY,
    error_type VARCHAR NOT NULL, -- system, api, agent, payment, integration
    error_category VARCHAR NOT NULL, -- timeout, rate_limit, validation, network, authentication
    error_code VARCHAR,
    error_message TEXT NOT NULL,
    
    -- Context
    affected_service VARCHAR,
    affected_user_id VARCHAR,
    affected_agent_id VARCHAR,
    affected_session_id VARCHAR,
    
    -- Request details
    request_method VARCHAR,
    request_path VARCHAR,
    request_headers JSONB DEFAULT '{}',
    request_body JSONB DEFAULT '{}',
    response_status INTEGER,
    
    -- Error details
    stack_trace TEXT,
    error_context JSONB DEFAULT '{}',
    
    -- Recovery
    is_recoverable BOOLEAN DEFAULT true,
    recovery_attempts INTEGER DEFAULT 0,
    max_recovery_attempts INTEGER DEFAULT 3,
    recovery_strategy VARCHAR, -- retry, fallback, manual, ignore
    recovery_status VARCHAR DEFAULT 'pending', -- pending, in_progress, recovered, failed
    
    -- Resolution
    resolved_at TIMESTAMP,
    resolution_method VARCHAR, -- auto_retry, fallback, manual_fix, escalation
    resolution_notes TEXT,
    
    -- Severity and impact
    severity VARCHAR DEFAULT 'medium', -- low, medium, high, critical
    impact_scope VARCHAR DEFAULT 'user', -- user, service, system, platform
    affected_users_count INTEGER DEFAULT 0,
    
    first_occurred_at TIMESTAMP DEFAULT NOW(),
    last_occurred_at TIMESTAMP DEFAULT NOW(),
    occurrence_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Circuit Breaker State Management
CREATE TABLE circuit_breakers (
    id VARCHAR PRIMARY KEY,
    service_name VARCHAR NOT NULL,
    endpoint VARCHAR NOT NULL,
    
    -- Circuit breaker state
    state VARCHAR DEFAULT 'closed', -- closed, open, half_open
    failure_threshold INTEGER DEFAULT 5,
    success_threshold INTEGER DEFAULT 3, -- For half-open to closed
    timeout_duration_ms INTEGER DEFAULT 60000, -- How long to stay open
    
    -- Counters
    failure_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    
    -- Timing
    last_failure_at TIMESTAMP,
    last_success_at TIMESTAMP,
    state_changed_at TIMESTAMP DEFAULT NOW(),
    next_attempt_at TIMESTAMP,
    
    -- Configuration
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Fallback Mechanisms
CREATE TABLE fallback_strategies (
    id VARCHAR PRIMARY KEY,
    strategy_name VARCHAR NOT NULL,
    service_name VARCHAR NOT NULL,
    error_pattern VARCHAR, -- Regex or error type to match
    
    -- Fallback configuration
    fallback_type VARCHAR NOT NULL, -- cache, default_response, alternative_service, queue_for_retry
    fallback_config JSONB NOT NULL,
    
    -- Conditions
    max_retries INTEGER DEFAULT 3,
    retry_delay_ms INTEGER DEFAULT 1000,
    exponential_backoff BOOLEAN DEFAULT true,
    
    -- Priority and conditions
    priority INTEGER DEFAULT 0, -- Higher priority strategies are tried first
    is_active BOOLEAN DEFAULT true,
    conditions JSONB DEFAULT '{}', -- Additional conditions for activation
    
    -- Statistics
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Rate Limiting Edge Cases
CREATE TABLE rate_limit_incidents (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR,
    ip_address VARCHAR,
    agent_id VARCHAR,
    
    -- Rate limit details
    limit_type VARCHAR NOT NULL, -- api_calls, agent_executions, file_uploads, bandwidth
    limit_value INTEGER NOT NULL,
    current_usage INTEGER NOT NULL,
    time_window_minutes INTEGER NOT NULL,
    
    -- Incident details
    exceeded_by INTEGER, -- How much the limit was exceeded
    incident_duration_ms INTEGER,
    requests_blocked INTEGER DEFAULT 0,
    
    -- Response strategy
    response_strategy VARCHAR DEFAULT 'block', -- block, throttle, queue, upgrade_prompt
    strategy_applied BOOLEAN DEFAULT false,
    
    -- Business impact
    revenue_impact_cents INTEGER DEFAULT 0,
    user_experience_impact VARCHAR DEFAULT 'minor', -- minor, moderate, severe
    
    -- Resolution
    resolved_automatically BOOLEAN DEFAULT false,
    manual_intervention_required BOOLEAN DEFAULT false,
    escalated_to_support BOOLEAN DEFAULT false,
    
    incident_time TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payment and Billing Edge Cases
CREATE TABLE payment_edge_cases (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    payment_intent_id VARCHAR,
    subscription_id VARCHAR,
    
    -- Edge case type
    case_type VARCHAR NOT NULL, -- partial_payment, refund_request, chargeback, failed_retry, currency_mismatch
    case_description TEXT NOT NULL,
    
    -- Financial details
    intended_amount_cents INTEGER,
    actual_amount_cents INTEGER,
    currency VARCHAR DEFAULT 'USD',
    discrepancy_cents INTEGER, -- Difference between intended and actual
    
    -- Context
    payment_method VARCHAR,
    stripe_error_code VARCHAR,
    stripe_error_message TEXT,
    
    -- Resolution strategy
    resolution_strategy VARCHAR, -- auto_refund, manual_review, contact_user, escalate
    auto_resolution_possible BOOLEAN DEFAULT false,
    requires_manual_review BOOLEAN DEFAULT true,
    
    -- Status tracking
    status VARCHAR DEFAULT 'open', -- open, in_review, resolved, escalated
    assigned_to VARCHAR, -- Support team member
    priority VARCHAR DEFAULT 'medium', -- low, medium, high, urgent
    
    -- Business impact
    revenue_at_risk_cents INTEGER DEFAULT 0,
    customer_satisfaction_impact VARCHAR DEFAULT 'medium',
    
    -- Resolution
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    resolution_method VARCHAR,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Data Consistency Issues
CREATE TABLE data_consistency_checks (
    id VARCHAR PRIMARY KEY,
    check_type VARCHAR NOT NULL, -- user_data, agent_data, revenue_data, analytics_data
    table_name VARCHAR NOT NULL,
    record_id VARCHAR,
    
    -- Inconsistency details
    inconsistency_type VARCHAR NOT NULL, -- missing_record, duplicate_record, invalid_reference, data_mismatch
    description TEXT NOT NULL,
    
    -- Data state
    expected_value JSONB,
    actual_value JSONB,
    
    -- Impact assessment
    severity VARCHAR DEFAULT 'medium', -- low, medium, high, critical
    affects_user_experience BOOLEAN DEFAULT false,
    affects_billing BOOLEAN DEFAULT false,
    affects_analytics BOOLEAN DEFAULT false,
    
    -- Resolution
    auto_fix_possible BOOLEAN DEFAULT false,
    auto_fix_applied BOOLEAN DEFAULT false,
    manual_fix_required BOOLEAN DEFAULT true,
    
    fix_strategy VARCHAR, -- data_repair, record_deletion, record_creation, manual_review
    fix_applied BOOLEAN DEFAULT false,
    fix_notes TEXT,
    
    -- Status
    status VARCHAR DEFAULT 'detected', -- detected, investigating, fixing, resolved
    resolved_at TIMESTAMP,
    
    detected_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Integration Failures
CREATE TABLE integration_failures (
    id VARCHAR PRIMARY KEY,
    integration_name VARCHAR NOT NULL, -- stripe, oauth_providers, email_service, file_storage
    failure_type VARCHAR NOT NULL, -- connection_timeout, authentication_failure, rate_limit, service_unavailable
    
    -- Request details
    endpoint VARCHAR,
    request_method VARCHAR,
    request_payload JSONB DEFAULT '{}',
    response_status INTEGER,
    response_body TEXT,
    
    -- Error context
    error_message TEXT,
    error_code VARCHAR,
    external_request_id VARCHAR,
    
    -- Impact
    affected_features TEXT[], -- List of features affected
    user_impact_level VARCHAR DEFAULT 'low', -- low, medium, high
    business_impact_level VARCHAR DEFAULT 'low',
    
    -- Recovery
    recovery_strategy VARCHAR, -- immediate_retry, delayed_retry, fallback_service, manual_intervention
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    
    recovery_successful BOOLEAN DEFAULT false,
    recovery_time_ms INTEGER,
    
    -- Status
    status VARCHAR DEFAULT 'active', -- active, recovering, resolved, escalated
    escalated_to_vendor BOOLEAN DEFAULT false,
    
    first_failed_at TIMESTAMP DEFAULT NOW(),
    last_retry_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for edge case handling
CREATE INDEX idx_system_health_metrics_type ON system_health_metrics(metric_type);
CREATE INDEX idx_system_health_metrics_service ON system_health_metrics(service_name);
CREATE INDEX idx_system_health_metrics_status ON system_health_metrics(status);
CREATE INDEX idx_system_health_metrics_measured ON system_health_metrics(measured_at);

CREATE INDEX idx_error_incidents_type ON error_incidents(error_type);
CREATE INDEX idx_error_incidents_category ON error_incidents(error_category);
CREATE INDEX idx_error_incidents_service ON error_incidents(affected_service);
CREATE INDEX idx_error_incidents_user ON error_incidents(affected_user_id);
CREATE INDEX idx_error_incidents_severity ON error_incidents(severity);
CREATE INDEX idx_error_incidents_status ON error_incidents(recovery_status);
CREATE INDEX idx_error_incidents_occurred ON error_incidents(first_occurred_at);

CREATE INDEX idx_circuit_breakers_service ON circuit_breakers(service_name);
CREATE INDEX idx_circuit_breakers_state ON circuit_breakers(state);
CREATE INDEX idx_circuit_breakers_enabled ON circuit_breakers(is_enabled);

CREATE INDEX idx_fallback_strategies_service ON fallback_strategies(service_name);
CREATE INDEX idx_fallback_strategies_active ON fallback_strategies(is_active);
CREATE INDEX idx_fallback_strategies_priority ON fallback_strategies(priority);

CREATE INDEX idx_rate_limit_incidents_user ON rate_limit_incidents(user_id);
CREATE INDEX idx_rate_limit_incidents_ip ON rate_limit_incidents(ip_address);
CREATE INDEX idx_rate_limit_incidents_type ON rate_limit_incidents(limit_type);
CREATE INDEX idx_rate_limit_incidents_time ON rate_limit_incidents(incident_time);

CREATE INDEX idx_payment_edge_cases_user ON payment_edge_cases(user_id);
CREATE INDEX idx_payment_edge_cases_type ON payment_edge_cases(case_type);
CREATE INDEX idx_payment_edge_cases_status ON payment_edge_cases(status);
CREATE INDEX idx_payment_edge_cases_priority ON payment_edge_cases(priority);

CREATE INDEX idx_data_consistency_checks_type ON data_consistency_checks(check_type);
CREATE INDEX idx_data_consistency_checks_table ON data_consistency_checks(table_name);
CREATE INDEX idx_data_consistency_checks_severity ON data_consistency_checks(severity);
CREATE INDEX idx_data_consistency_checks_status ON data_consistency_checks(status);

CREATE INDEX idx_integration_failures_integration ON integration_failures(integration_name);
CREATE INDEX idx_integration_failures_type ON integration_failures(failure_type);
CREATE INDEX idx_integration_failures_status ON integration_failures(status);
CREATE INDEX idx_integration_failures_failed ON integration_failures(first_failed_at);

-- PostgreSQL functions for edge case handling
CREATE OR REPLACE FUNCTION record_error_incident(
    p_error_type VARCHAR,
    p_error_category VARCHAR,
    p_error_message TEXT,
    p_affected_service VARCHAR DEFAULT NULL,
    p_affected_user_id VARCHAR DEFAULT NULL,
    p_severity VARCHAR DEFAULT 'medium',
    p_error_context JSONB DEFAULT '{}'
)
RETURNS VARCHAR AS $$
DECLARE
    incident_id VARCHAR;
    existing_incident_id VARCHAR;
BEGIN
    -- Generate incident ID
    incident_id := 'inc_' || EXTRACT(epoch FROM NOW()) || '_' || substr(md5(random()::text), 1, 8);
    
    -- Check for similar recent incident
    SELECT id INTO existing_incident_id
    FROM error_incidents
    WHERE error_type = p_error_type
        AND error_category = p_error_category
        AND affected_service = p_affected_service
        AND recovery_status != 'recovered'
        AND first_occurred_at > NOW() - INTERVAL '1 hour'
    ORDER BY first_occurred_at DESC
    LIMIT 1;
    
    IF existing_incident_id IS NOT NULL THEN
        -- Update existing incident
        UPDATE error_incidents
        SET occurrence_count = occurrence_count + 1,
            last_occurred_at = NOW(),
            updated_at = NOW()
        WHERE id = existing_incident_id;
        
        RETURN existing_incident_id;
    ELSE
        -- Create new incident
        INSERT INTO error_incidents (
            id, error_type, error_category, error_message,
            affected_service, affected_user_id, severity,
            error_context, created_at
        ) VALUES (
            incident_id, p_error_type, p_error_category, p_error_message,
            p_affected_service, p_affected_user_id, p_severity,
            p_error_context, NOW()
        );
        
        RETURN incident_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check circuit breaker state
CREATE OR REPLACE FUNCTION check_circuit_breaker(
    p_service_name VARCHAR,
    p_endpoint VARCHAR
)
RETURNS TABLE(
    state VARCHAR,
    should_allow_request BOOLEAN,
    failure_count INTEGER
) AS $$
DECLARE
    breaker_record RECORD;
    should_allow BOOLEAN := true;
BEGIN
    -- Get circuit breaker state
    SELECT * INTO breaker_record
    FROM circuit_breakers
    WHERE service_name = p_service_name
        AND endpoint = p_endpoint
        AND is_enabled = true;
    
    IF breaker_record IS NULL THEN
        -- No circuit breaker configured, allow request
        RETURN QUERY SELECT 'closed'::VARCHAR, true, 0;
        RETURN;
    END IF;
    
    -- Check state and determine if request should be allowed
    CASE breaker_record.state
        WHEN 'open' THEN
            -- Check if timeout period has passed
            IF NOW() >= breaker_record.next_attempt_at THEN
                -- Transition to half-open
                UPDATE circuit_breakers
                SET state = 'half_open',
                    state_changed_at = NOW(),
                    updated_at = NOW()
                WHERE id = breaker_record.id;
                
                should_allow := true;
            ELSE
                should_allow := false;
            END IF;
        
        WHEN 'half_open' THEN
            should_allow := true;
        
        WHEN 'closed' THEN
            should_allow := true;
    END CASE;
    
    RETURN QUERY SELECT 
        breaker_record.state,
        should_allow,
        breaker_record.failure_count;
END;
$$ LANGUAGE plpgsql;

-- Function to record circuit breaker result
CREATE OR REPLACE FUNCTION record_circuit_breaker_result(
    p_service_name VARCHAR,
    p_endpoint VARCHAR,
    p_success BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
    breaker_record RECORD;
    new_state VARCHAR;
BEGIN
    -- Get current circuit breaker state
    SELECT * INTO breaker_record
    FROM circuit_breakers
    WHERE service_name = p_service_name
        AND endpoint = p_endpoint
        AND is_enabled = true;
    
    IF breaker_record IS NULL THEN
        RETURN false;
    END IF;
    
    new_state := breaker_record.state;
    
    IF p_success THEN
        -- Success case
        CASE breaker_record.state
            WHEN 'half_open' THEN
                -- Check if we have enough successes to close
                IF breaker_record.success_count + 1 >= breaker_record.success_threshold THEN
                    new_state := 'closed';
                    UPDATE circuit_breakers
                    SET state = new_state,
                        success_count = 0,
                        failure_count = 0,
                        last_success_at = NOW(),
                        state_changed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = breaker_record.id;
                ELSE
                    UPDATE circuit_breakers
                    SET success_count = success_count + 1,
                        last_success_at = NOW(),
                        updated_at = NOW()
                    WHERE id = breaker_record.id;
                END IF;
            
            WHEN 'closed' THEN
                UPDATE circuit_breakers
                SET success_count = success_count + 1,
                    failure_count = 0,
                    last_success_at = NOW(),
                    updated_at = NOW()
                WHERE id = breaker_record.id;
        END CASE;
    ELSE
        -- Failure case
        CASE breaker_record.state
            WHEN 'closed' THEN
                IF breaker_record.failure_count + 1 >= breaker_record.failure_threshold THEN
                    new_state := 'open';
                    UPDATE circuit_breakers
                    SET state = new_state,
                        failure_count = failure_count + 1,
                        last_failure_at = NOW(),
                        next_attempt_at = NOW() + INTERVAL '1 millisecond' * timeout_duration_ms,
                        state_changed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = breaker_record.id;
                ELSE
                    UPDATE circuit_breakers
                    SET failure_count = failure_count + 1,
                        last_failure_at = NOW(),
                        updated_at = NOW()
                    WHERE id = breaker_record.id;
                END IF;
            
            WHEN 'half_open' THEN
                new_state := 'open';
                UPDATE circuit_breakers
                SET state = new_state,
                    failure_count = failure_count + 1,
                    success_count = 0,
                    last_failure_at = NOW(),
                    next_attempt_at = NOW() + INTERVAL '1 millisecond' * timeout_duration_ms,
                    state_changed_at = NOW(),
                    updated_at = NOW()
                WHERE id = breaker_record.id;
        END CASE;
    END IF;
    
    -- Update total request count
    UPDATE circuit_breakers
    SET total_requests = total_requests + 1
    WHERE id = breaker_record.id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get system health status
CREATE OR REPLACE FUNCTION get_system_health_status()
RETURNS TABLE(
    overall_status VARCHAR,
    critical_issues INTEGER,
    warning_issues INTEGER,
    services_down INTEGER,
    recent_errors INTEGER
) AS $$
DECLARE
    critical_count INTEGER := 0;
    warning_count INTEGER := 0;
    services_down_count INTEGER := 0;
    recent_error_count INTEGER := 0;
    overall_health VARCHAR := 'healthy';
BEGIN
    -- Count critical and warning metrics
    SELECT 
        COUNT(*) FILTER (WHERE status = 'critical'),
        COUNT(*) FILTER (WHERE status = 'warning')
    INTO critical_count, warning_count
    FROM system_health_metrics
    WHERE measured_at > NOW() - INTERVAL '5 minutes';
    
    -- Count services that are down (circuit breakers open)
    SELECT COUNT(*)
    INTO services_down_count
    FROM circuit_breakers
    WHERE state = 'open'
        AND is_enabled = true;
    
    -- Count recent errors
    SELECT COUNT(*)
    INTO recent_error_count
    FROM error_incidents
    WHERE first_occurred_at > NOW() - INTERVAL '1 hour'
        AND recovery_status != 'recovered';
    
    -- Determine overall status
    IF critical_count > 0 OR services_down_count > 0 THEN
        overall_health := 'critical';
    ELSIF warning_count > 0 OR recent_error_count > 10 THEN
        overall_health := 'warning';
    ELSE
        overall_health := 'healthy';
    END IF;
    
    RETURN QUERY SELECT 
        overall_health,
        critical_count,
        warning_count,
        services_down_count,
        recent_error_count;
END;
$$ LANGUAGE plpgsql;
