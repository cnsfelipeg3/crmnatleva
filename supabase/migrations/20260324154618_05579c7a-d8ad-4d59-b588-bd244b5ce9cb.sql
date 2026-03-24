
-- Copy A VIRADA flow to 'flows' table
INSERT INTO flows (id, name, description, status, is_active, version)
SELECT id, name, description, status, true, version
FROM automation_flows
WHERE id = 'db340ada-cdfd-4211-8eaf-461378235275'
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- Copy nodes from automation_nodes to flow_nodes
INSERT INTO flow_nodes (flow_id, node_id, node_type, label, config, position_x, position_y)
SELECT flow_id, id, node_type, label, config, position_x, position_y
FROM automation_nodes
WHERE flow_id = 'db340ada-cdfd-4211-8eaf-461378235275'
ON CONFLICT DO NOTHING;

-- Copy edges from automation_edges to flow_edges
INSERT INTO flow_edges (flow_id, edge_id, source_node_id, target_node_id, source_handle, target_handle, label)
SELECT flow_id, id, source_node_id, target_node_id, source_handle, target_handle, label
FROM automation_edges
WHERE flow_id = 'db340ada-cdfd-4211-8eaf-461378235275'
ON CONFLICT DO NOTHING;
