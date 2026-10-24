workspace "EAW Roadmap graph" "Planning model: authority, runtime boundaries and manual synchronization. REQ-001..005, REQ-023, REQ-030..035." {
    model {
        planner = person "Planner" "Changes the plan through dialogue; inspects the graph."
        agent = softwareSystem "Agent and host" "Explicit workflow/provider operations; no autonomous next-stage execution."
        github = softwareSystem "GitHub.com" "One Project and one Issues repository; source of bound task fields and native prerequisites." {
            tags "External"
        }
        gh = softwareSystem "Installed gh" "Existing authentication; direct bounded read-only subprocess." {
            tags "External"
        }
        specifications = softwareSystem "Specification workspace" "Existing task specifications/bindings and review evidence; read-only to the graph." {
            tags "External"
        }
        eaw = softwareSystem "Engineer Agent Workflows" "Keeps workflow authority separate from current board observations." {
            mcp = container "Workflow MCP process" "Owns graph operations, explicit sync and the local viewer lifetime." "Node.js / TypeScript" {
                tools = component "Graph MCP operations" "Schema-bound agent data/commands; source-bound portions, not web pages." "Existing product tool registration"
                policy = component "Graph policy kernel" "Pure validation, active projection, longest-path layers, bitset reduction and independent signals." "graph.ts"
                sync = component "Manual sync coordinator" "One per-product active operation; complete membership, partial components, deadlines and guarded publication." "graph-sync.ts"
                reader = component "GitHub reader" "Fixed GraphQL documents; opaque IDs and complete required page chains." "github-roadmap.ts"
                records = component "Graph store adapter" "Existing immutable objects plus atomic graph pointer; safe paths and short product write lock." "graph-store.ts"
                evidence = component "Specification evidence reader" "Current Approved/review/binding signal, independent of plans and execution readiness." "Existing tasks.ts ownership"
                http = component "Local HTTP viewer" "Literal loopback listener, path-scoped sessions, direct HTTP, safe POST and lifecycle disposal." "graph-http.ts"
                render = component "Dynamic SVG and list renderer" "Derives current escaped SVG/HTML on request; no saved generated graph." "viewer/render.ts"
            }
            browser = container "Desktop browser" "Shows the server-rendered view; local search, filters, selection, real pan/zoom and explicit sync." "HTML / CSS / native ES modules"
            store = container "Separate product-data root" "Immutable workflow sources plus normalized graph observations/bindings/supplements; no rendered HTML/SVG/layout." "Existing filesystem product store"
        }

        planner -> agent "Requests planning, explicit binding and manual sync"
        planner -> browser "Inspects graph and list; explicitly clicks sync"
        agent -> github "Creates/changes external entities using provider tools"
        agent -> mcp "Calls explicit operations and reads bounded data" "MCP / stdio"
        browser -> mcp "Receives dynamic view/assets and requests manual sync directly" "Loopback HTTP"
        tools -> policy "Derives local source previews"
        tools -> evidence "Reads current specification signal"
        tools -> records "Reads/configures/binds/restores local records"
        tools -> sync "Explicit start/status/cancel"
        tools -> http "Explicit open/stop"
        http -> records "Reads one valid current source observation"
        http -> evidence "Reads current specification signal"
        http -> policy "Derives current projection"
        http -> render "Generates current escaped SVG and equivalent list"
        http -> sync "Explicit start/status/cancel from browser"
        render -> policy "Uses the shared projection; does not own policy"
        sync -> reader "Requests complete normalized observations"
        reader -> gh "Invokes fixed read-only query operations" "Direct child process"
        gh -> github "Reads Project, Issue, Milestone and blockedBy data" "Authenticated GraphQL"
        sync -> policy "Validates union components and final graph"
        sync -> records "Publishes a complete guarded revision"
        records -> store "Reads immutable snapshots and replaces graph head atomically"
        evidence -> specifications "Reads current specification/review state without writes"
        evidence -> store "Reads existing native task bindings"
    }

    views {
        systemContext eaw "context" {
            include *
            autoLayout lr
        }
        container eaw "containers" {
            include *
            autoLayout lr
        }
        component mcp "boundaries" {
            include *
            autoLayout tb
        }
        dynamic mcp "manualSync" {
            tools -> sync "Explicit start; overlap returns the active operation"
            sync -> reader "Read with current binding and deadlines"
            reader -> gh "Direct fixed gh query"
            gh -> github "Read all required pages"
            sync -> policy "Reconcile valid components and derive graph"
            sync -> records "Recheck source/bindings and publish atomically"
            records -> store "Replace only the graph head"
            http -> records "Read current normalized observations"
            http -> render "Generate fresh SVG/list for the browser"
            autoLayout tb
        }
        styles {
            element "External" {
                background #64748B
                color #FFFFFF
            }
        }
    }
}
// No event broker, scheduled sync, provider mutation inside EAW, graph editor,
// private reference checkout or generated-graph database belongs to this model.
