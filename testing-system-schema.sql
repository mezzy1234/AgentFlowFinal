-- Testing System Schema for AgentFlow Platform
-- Comprehensive automated testing infrastructure with test generation, execution, and monitoring

-- Test Suites - Collections of tests for agents
CREATE TABLE test_suites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    suite_name TEXT NOT NULL,
    description TEXT,
    total_tests INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT unique_suite_per_agent UNIQUE(agent_id, suite_name)
);

-- Test Cases - Individual test definitions
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    test_type TEXT NOT NULL DEFAULT 'functional', -- functional, edge_case, error_handling, security, performance
    input_data JSONB NOT NULL DEFAULT '{}',
    expected_output JSONB,
    assertions JSONB DEFAULT '[]', -- Array of assertion objects
    mock_credentials JSONB, -- Override credentials for testing
    timeout_seconds INTEGER DEFAULT 30,
    order_index INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_test_type CHECK (test_type IN ('functional', 'edge_case', 'error_handling', 'security', 'performance', 'integration'))
);

-- Test Runs - Execution instances of test suites
CREATE TABLE test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    run_by UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, passed, failed, cancelled
    run_mode TEXT DEFAULT 'parallel', -- parallel, sequential
    total_tests INTEGER DEFAULT 0,
    passed_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    skipped_tests INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_run_status CHECK (status IN ('pending', 'running', 'passed', 'failed', 'cancelled'))
);

-- Test Results - Individual test case execution results
CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- passed, failed, skipped, error
    execution_time_ms INTEGER DEFAULT 0,
    output_data JSONB,
    error_message TEXT,
    assertions_passed INTEGER DEFAULT 0,
    assertions_failed INTEGER DEFAULT 0,
    assertion_details JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_result_status CHECK (status IN ('passed', 'failed', 'skipped', 'error'))
);

-- Load Tests - Performance and stress testing configurations
CREATE TABLE load_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    test_name TEXT NOT NULL,
    description TEXT,
    concurrent_users INTEGER NOT NULL DEFAULT 1,
    duration_seconds INTEGER NOT NULL DEFAULT 60,
    ramp_up_seconds INTEGER DEFAULT 0,
    test_scenario JSONB NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'created', -- created, running, completed, failed
    results JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_load_test_status CHECK (status IN ('created', 'running', 'completed', 'failed')),
    CONSTRAINT positive_concurrent_users CHECK (concurrent_users > 0),
    CONSTRAINT positive_duration CHECK (duration_seconds > 0)
);

-- Scheduled Tests - Automated test scheduling for regression testing
CREATE TABLE scheduled_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    test_type TEXT NOT NULL DEFAULT 'regression', -- regression, smoke, full
    schedule_cron TEXT NOT NULL, -- Cron expression for scheduling
    test_suite_ids UUID[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_scheduled_test_type CHECK (test_type IN ('regression', 'smoke', 'full', 'security'))
);

-- Test Coverage Tracking - Track what types of tests exist for each agent
CREATE TABLE test_coverage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL,
    coverage_percentage DECIMAL(5,2) DEFAULT 0.00,
    total_scenarios INTEGER DEFAULT 0,
    covered_scenarios INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT unique_coverage_per_agent_type UNIQUE(agent_id, test_type),
    CONSTRAINT valid_coverage_percentage CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100)
);

-- Test Performance Metrics - Track test execution performance over time
CREATE TABLE test_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL, -- response_time, throughput, error_rate, success_rate
    metric_value DECIMAL(10,4) NOT NULL,
    measurement_unit TEXT NOT NULL, -- ms, req/sec, percentage
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_metric_type CHECK (metric_type IN ('response_time', 'throughput', 'error_rate', 'success_rate', 'cpu_usage', 'memory_usage'))
);

-- Test Data Templates - Reusable test data for different scenarios
CREATE TABLE test_data_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    template_name TEXT NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL DEFAULT '{}',
    template_type TEXT NOT NULL DEFAULT 'input', -- input, output, credential, mock
    tags TEXT[] DEFAULT '{}',
    public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_template_type CHECK (template_type IN ('input', 'output', 'credential', 'mock', 'assertion'))
);

-- Test Environments - Different testing environments and configurations
CREATE TABLE test_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    environment_name TEXT NOT NULL,
    description TEXT,
    base_url TEXT,
    environment_variables JSONB DEFAULT '{}',
    mock_services JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT unique_environment_per_user UNIQUE(created_by, environment_name)
);

-- Test Reports - Aggregated test reporting and analytics
CREATE TABLE test_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    generated_by UUID NOT NULL REFERENCES auth.users(id),
    report_type TEXT NOT NULL DEFAULT 'summary', -- summary, detailed, regression, coverage
    report_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    report_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    report_data JSONB NOT NULL DEFAULT '{}',
    total_tests_run INTEGER DEFAULT 0,
    total_passed INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    coverage_percentage DECIMAL(5,2) DEFAULT 0.00,
    performance_score DECIMAL(5,2) DEFAULT 0.00,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_report_type CHECK (report_type IN ('summary', 'detailed', 'regression', 'coverage', 'performance'))
);

-- Create indexes for performance
CREATE INDEX idx_test_suites_agent_id ON test_suites(agent_id);
CREATE INDEX idx_test_suites_created_by ON test_suites(created_by);
CREATE INDEX idx_test_cases_suite_id ON test_cases(suite_id);
CREATE INDEX idx_test_cases_test_type ON test_cases(test_type);
CREATE INDEX idx_test_runs_suite_id ON test_runs(suite_id);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_created_at ON test_runs(created_at DESC);
CREATE INDEX idx_test_results_run_id ON test_results(run_id);
CREATE INDEX idx_test_results_test_case_id ON test_results(test_case_id);
CREATE INDEX idx_test_results_status ON test_results(status);
CREATE INDEX idx_load_tests_agent_id ON load_tests(agent_id);
CREATE INDEX idx_load_tests_status ON load_tests(status);
CREATE INDEX idx_scheduled_tests_agent_id ON scheduled_tests(agent_id);
CREATE INDEX idx_scheduled_tests_active ON scheduled_tests(active);
CREATE INDEX idx_scheduled_tests_next_run ON scheduled_tests(next_run_at);
CREATE INDEX idx_test_coverage_agent_id ON test_coverage(agent_id);
CREATE INDEX idx_test_performance_agent_id ON test_performance_metrics(agent_id);
CREATE INDEX idx_test_performance_recorded_at ON test_performance_metrics(recorded_at DESC);
CREATE INDEX idx_test_data_templates_created_by ON test_data_templates(created_by);
CREATE INDEX idx_test_data_templates_public ON test_data_templates(public);
CREATE INDEX idx_test_environments_created_by ON test_environments(created_by);
CREATE INDEX idx_test_reports_agent_id ON test_reports(agent_id);
CREATE INDEX idx_test_reports_generated_at ON test_reports(generated_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_data_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_suites
CREATE POLICY "Users can view their own test suites" ON test_suites
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create test suites for their agents" ON test_suites
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM agents 
            WHERE id = agent_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own test suites" ON test_suites
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own test suites" ON test_suites
    FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for test_cases
CREATE POLICY "Users can view test cases for their test suites" ON test_cases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM test_suites 
            WHERE id = suite_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create test cases for their test suites" ON test_cases
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM test_suites 
            WHERE id = suite_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update test cases for their test suites" ON test_cases
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM test_suites 
            WHERE id = suite_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete test cases for their test suites" ON test_cases
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM test_suites 
            WHERE id = suite_id AND created_by = auth.uid()
        )
    );

-- RLS Policies for test_runs
CREATE POLICY "Users can view their own test runs" ON test_runs
    FOR SELECT USING (run_by = auth.uid());

CREATE POLICY "Users can create test runs for their test suites" ON test_runs
    FOR INSERT WITH CHECK (
        run_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM test_suites 
            WHERE id = suite_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own test runs" ON test_runs
    FOR UPDATE USING (run_by = auth.uid());

-- RLS Policies for test_results
CREATE POLICY "Users can view test results for their test runs" ON test_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM test_runs 
            WHERE id = run_id AND run_by = auth.uid()
        )
    );

CREATE POLICY "Users can create test results for their test runs" ON test_results
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM test_runs 
            WHERE id = run_id AND run_by = auth.uid()
        )
    );

-- RLS Policies for load_tests
CREATE POLICY "Users can view their own load tests" ON load_tests
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create load tests for their agents" ON load_tests
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM agents 
            WHERE id = agent_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own load tests" ON load_tests
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own load tests" ON load_tests
    FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for scheduled_tests
CREATE POLICY "Users can view their own scheduled tests" ON scheduled_tests
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create scheduled tests for their agents" ON scheduled_tests
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM agents 
            WHERE id = agent_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own scheduled tests" ON scheduled_tests
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own scheduled tests" ON scheduled_tests
    FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for test_coverage
CREATE POLICY "Users can view test coverage for their agents" ON test_coverage
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE id = agent_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "System can update test coverage" ON test_coverage
    FOR ALL USING (true);

-- RLS Policies for test_performance_metrics
CREATE POLICY "Users can view performance metrics for their agents" ON test_performance_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE id = agent_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "System can insert performance metrics" ON test_performance_metrics
    FOR INSERT WITH CHECK (true);

-- RLS Policies for test_data_templates
CREATE POLICY "Users can view their own test data templates" ON test_data_templates
    FOR SELECT USING (created_by = auth.uid() OR public = true);

CREATE POLICY "Users can create test data templates" ON test_data_templates
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own test data templates" ON test_data_templates
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own test data templates" ON test_data_templates
    FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for test_environments
CREATE POLICY "Users can view their own test environments" ON test_environments
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create test environments" ON test_environments
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own test environments" ON test_environments
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own test environments" ON test_environments
    FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for test_reports
CREATE POLICY "Users can view test reports for their agents" ON test_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE id = agent_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can generate test reports for their agents" ON test_reports
    FOR INSERT WITH CHECK (
        generated_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM agents 
            WHERE id = agent_id AND created_by = auth.uid()
        )
    );

-- Functions for automatic test coverage calculation
CREATE OR REPLACE FUNCTION calculate_test_coverage(agent_uuid UUID)
RETURNS void AS $$
DECLARE
    test_type_record RECORD;
    total_scenarios INTEGER;
    covered_scenarios INTEGER;
    coverage_pct DECIMAL(5,2);
BEGIN
    -- Calculate coverage for each test type
    FOR test_type_record IN 
        SELECT DISTINCT test_type FROM test_cases 
        WHERE suite_id IN (
            SELECT id FROM test_suites WHERE agent_id = agent_uuid
        )
    LOOP
        -- Count total possible scenarios (this is simplified)
        total_scenarios := 10; -- In real implementation, this would be dynamic
        
        -- Count covered scenarios
        SELECT COUNT(*) INTO covered_scenarios
        FROM test_cases tc
        JOIN test_suites ts ON tc.suite_id = ts.id
        WHERE ts.agent_id = agent_uuid 
        AND tc.test_type = test_type_record.test_type
        AND tc.active = true;
        
        -- Calculate percentage
        coverage_pct := CASE 
            WHEN total_scenarios > 0 THEN (covered_scenarios::DECIMAL / total_scenarios) * 100
            ELSE 0
        END;
        
        -- Insert or update coverage record
        INSERT INTO test_coverage (agent_id, test_type, coverage_percentage, total_scenarios, covered_scenarios)
        VALUES (agent_uuid, test_type_record.test_type, coverage_pct, total_scenarios, covered_scenarios)
        ON CONFLICT (agent_id, test_type)
        DO UPDATE SET
            coverage_percentage = EXCLUDED.coverage_percentage,
            total_scenarios = EXCLUDED.total_scenarios,
            covered_scenarios = EXCLUDED.covered_scenarios,
            last_updated = now();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update test coverage when test cases change
CREATE OR REPLACE FUNCTION trigger_update_test_coverage()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM calculate_test_coverage(
            (SELECT agent_id FROM test_suites WHERE id = OLD.suite_id)
        );
        RETURN OLD;
    ELSE
        PERFORM calculate_test_coverage(
            (SELECT agent_id FROM test_suites WHERE id = NEW.suite_id)
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_test_coverage_trigger
    AFTER INSERT OR UPDATE OR DELETE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION trigger_update_test_coverage();

-- Function to update test suite counters
CREATE OR REPLACE FUNCTION update_test_suite_counters()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE test_suites 
        SET total_tests = (
            SELECT COUNT(*) FROM test_cases 
            WHERE suite_id = OLD.suite_id AND active = true
        )
        WHERE id = OLD.suite_id;
        RETURN OLD;
    ELSE
        UPDATE test_suites 
        SET total_tests = (
            SELECT COUNT(*) FROM test_cases 
            WHERE suite_id = NEW.suite_id AND active = true
        )
        WHERE id = NEW.suite_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_suite_counters_trigger
    AFTER INSERT OR UPDATE OR DELETE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_test_suite_counters();

-- Function to auto-update next run time for scheduled tests
CREATE OR REPLACE FUNCTION update_next_run_time()
RETURNS trigger AS $$
BEGIN
    -- This is a simplified version - in production you'd use a proper cron parser
    NEW.next_run_at := NEW.last_run_at + INTERVAL '1 day';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_next_run_trigger
    BEFORE UPDATE OF last_run_at ON scheduled_tests
    FOR EACH ROW EXECUTE FUNCTION update_next_run_time();

-- Create materialized view for test analytics dashboard
CREATE MATERIALIZED VIEW test_analytics_summary AS
SELECT 
    a.id as agent_id,
    a.agent_name,
    a.created_by,
    COUNT(DISTINCT ts.id) as total_test_suites,
    COUNT(DISTINCT tc.id) as total_test_cases,
    COUNT(DISTINCT tr.id) as total_test_runs,
    COUNT(DISTINCT CASE WHEN tr.status = 'passed' THEN tr.id END) as passed_runs,
    COUNT(DISTINCT CASE WHEN tr.status = 'failed' THEN tr.id END) as failed_runs,
    AVG(tr.execution_time_ms) as avg_execution_time,
    MAX(tr.created_at) as last_test_run,
    COALESCE(AVG(tc_coverage.coverage_percentage), 0) as avg_coverage_percentage
FROM agents a
LEFT JOIN test_suites ts ON a.id = ts.agent_id AND ts.active = true
LEFT JOIN test_cases tc ON ts.id = tc.suite_id AND tc.active = true
LEFT JOIN test_runs tr ON ts.id = tr.suite_id
LEFT JOIN test_coverage tc_coverage ON a.id = tc_coverage.agent_id
GROUP BY a.id, a.agent_name, a.created_by;

-- Index for the materialized view
CREATE INDEX idx_test_analytics_created_by ON test_analytics_summary(created_by);
CREATE INDEX idx_test_analytics_agent_id ON test_analytics_summary(agent_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_test_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY test_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
