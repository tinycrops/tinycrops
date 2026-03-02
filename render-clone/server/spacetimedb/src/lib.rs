use spacetimedb::{ReducerContext, SpacetimeType, Table, Identity, Timestamp};

// ──────────────────────────────────────────────────────────────────────────────
// Custom types (SpacetimeType for enums/structs used as table fields/reducer args)
// ──────────────────────────────────────────────────────────────────────────────

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum ServiceKind {
    WebService,
    StaticSite,
    BackgroundWorker,
    CronJob,
    PrivateService,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum ServiceStatus {
    Creating,
    Live,
    Paused,
    Suspended,
    Deleted,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum DeployStatus {
    Queued,
    Building,
    Deploying,
    Live,
    Failed,
    Cancelled,
    Skipped,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum DatabaseKind {
    Postgres,
    KeyValue,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum DatabaseStatus {
    Creating,
    Available,
    Resizing,
    Deleted,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum MemberRole {
    Owner,
    Admin,
    Member,
    Viewer,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum Region {
    UsEast1,   // US East (Ohio)
    UsWest2,   // US West (Oregon)
    EuWest1,   // EU (Frankfurt)
    ApSe1,     // Singapore
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum NotificationKind {
    DeploySucceeded,
    DeployFailed,
    ServicePaused,
    ServiceResumed,
    DomainVerified,
    DatabaseReady,
    TeamMemberAdded,
    BillingAlert,
    ScalingEvent,
}

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum InstanceType {
    Free,
    Starter,
    Standard,
    Pro,
    ProPlus,
    ProMax,
    ProUltra,
}

// ──────────────────────────────────────────────────────────────────────────────
// Tables
// ──────────────────────────────────────────────────────────────────────────────

/// Platform users — one row per authenticated identity
#[spacetimedb::table(accessor = user, public)]
pub struct User {
    #[primary_key]
    pub identity: Identity,
    #[unique]
    pub username: String,
    pub email: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

/// Organizations / teams
#[spacetimedb::table(accessor = team, public)]
pub struct Team {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub name: String,
    #[unique]
    pub slug: String,
    pub owner_identity: Identity,
    pub avatar_url: Option<String>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

/// Team membership — maps users to teams with a role
#[spacetimedb::table(accessor = team_member, public)]
pub struct TeamMember {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub team_id: u64,
    #[index(btree)]
    pub user_identity: Identity,
    pub role: MemberRole,
    pub joined_at: Timestamp,
}

/// Deployed services (web, worker, cron, static, private)
#[spacetimedb::table(accessor = service, public)]
pub struct Service {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub team_id: u64,
    pub owner_identity: Identity,
    pub name: String,
    pub service_kind: ServiceKind,
    pub status: ServiceStatus,
    pub region: Region,
    // Source
    pub repo_url: Option<String>,
    pub branch: Option<String>,
    pub docker_command: Option<String>,
    // Build
    pub build_command: Option<String>,
    pub start_command: Option<String>,
    // Runtime
    pub instance_type: InstanceType,
    pub num_instances: u32,
    // Autoscaling
    pub auto_scaling: bool,
    pub min_instances: u32,
    pub max_instances: u32,
    // Networking
    pub port: Option<u32>,
    pub health_check_path: Option<String>,
    // Cron (CronJob only)
    pub cron_schedule: Option<String>,
    // URLs
    pub internal_url: Option<String>,
    pub external_url: Option<String>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

/// A single deployment run for a service
#[spacetimedb::table(accessor = deployment, public)]
pub struct Deployment {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub service_id: u64,
    pub triggered_by: Identity,
    pub status: DeployStatus,
    pub commit_sha: Option<String>,
    pub commit_message: Option<String>,
    pub image_url: Option<String>,
    pub build_duration_secs: Option<u32>,
    pub deploy_duration_secs: Option<u32>,
    pub error_message: Option<String>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
    pub finished_at: Option<Timestamp>,
}

/// Streaming log lines for a deployment
#[spacetimedb::table(accessor = deployment_log, public)]
pub struct DeploymentLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub deployment_id: u64,
    pub level: LogLevel,
    pub message: String,
    pub timestamp: Timestamp,
}

/// Environment variables / secrets per service
#[spacetimedb::table(accessor = env_var, public)]
pub struct EnvVar {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub service_id: u64,
    pub key: String,
    pub value: String,
    pub is_secret: bool,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

/// Custom domains attached to services
#[spacetimedb::table(accessor = domain, public)]
pub struct Domain {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub service_id: u64,
    pub domain_name: String,
    pub verified: bool,
    pub verification_token: String,
    pub tls_enabled: bool,
    pub redirect_to_https: bool,
    pub created_at: Timestamp,
}

/// Managed databases (Postgres / Key-Value / Redis-compatible)
#[spacetimedb::table(accessor = managed_database, public)]
pub struct ManagedDatabase {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub team_id: u64,
    pub owner_identity: Identity,
    pub name: String,
    pub db_kind: DatabaseKind,
    pub status: DatabaseStatus,
    pub region: Region,
    pub version: String,
    pub instance_type: InstanceType,
    pub storage_gb: u32,
    pub connection_string: Option<String>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

/// Autoscaling policies per service
#[spacetimedb::table(accessor = scaling_policy, public)]
pub struct ScalingPolicy {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[unique]
    pub service_id: u64,
    pub min_instances: u32,
    pub max_instances: u32,
    pub target_cpu_percent: u32,
    pub target_memory_percent: u32,
    pub scale_up_cooldown_secs: u32,
    pub scale_down_cooldown_secs: u32,
    pub updated_at: Timestamp,
}

/// Persistent disks attached to services
#[spacetimedb::table(accessor = persistent_disk, public)]
pub struct PersistentDisk {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub service_id: u64,
    pub name: String,
    pub mount_path: String,
    pub size_gb: u32,
    pub created_at: Timestamp,
}

/// In-app notifications (deploy status, billing alerts, etc.)
#[spacetimedb::table(accessor = notification, public)]
pub struct Notification {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub user_identity: Identity,
    pub team_id: Option<u64>,
    pub service_id: Option<u64>,
    pub kind: NotificationKind,
    pub title: String,
    pub body: String,
    pub read: bool,
    pub created_at: Timestamp,
}

/// Audit log for compliance / SOC2
#[spacetimedb::table(accessor = audit_log, public)]
pub struct AuditLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub team_id: u64,
    pub actor_identity: Identity,
    pub action: String,
    pub resource_type: String,
    pub resource_id: u64,
    pub details: Option<String>,
    pub timestamp: Timestamp,
}

/// Preview environments — ephemeral per-PR environments
#[spacetimedb::table(accessor = preview_env, public)]
pub struct PreviewEnv {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub service_id: u64,
    pub pr_number: u32,
    pub pr_title: String,
    pub branch: String,
    pub url: String,
    pub status: ServiceStatus,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

// ──────────────────────────────────────────────────────────────────────────────
// Lifecycle reducers
// ──────────────────────────────────────────────────────────────────────────────

#[spacetimedb::reducer(init)]
pub fn init(_ctx: &ReducerContext) {
    log::info!("Render clone module initialized");
}

#[spacetimedb::reducer(client_connected)]
pub fn client_connected(_ctx: &ReducerContext) {}

#[spacetimedb::reducer(client_disconnected)]
pub fn client_disconnected(_ctx: &ReducerContext) {}

// ──────────────────────────────────────────────────────────────────────────────
// User management
// ──────────────────────────────────────────────────────────────────────────────

/// Register a new platform account (called after first OIDC login)
#[spacetimedb::reducer]
pub fn register(
    ctx: &ReducerContext,
    username: String,
    email: String,
    display_name: String,
) -> Result<(), String> {
    if ctx.db.user().identity().find(ctx.sender()).is_some() {
        return Err("User already registered".to_string());
    }
    if username.trim().is_empty() {
        return Err("Username is required".to_string());
    }
    if email.trim().is_empty() {
        return Err("Email is required".to_string());
    }
    if ctx.db.user().username().find(&username).is_some() {
        return Err(format!("Username '{}' is already taken", username));
    }
    ctx.db.user().insert(User {
        identity: ctx.sender(),
        username,
        email,
        display_name,
        avatar_url: None,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
    });
    log::info!("New user registered: {}", ctx.sender().to_hex().to_string());
    Ok(())
}

/// Update display name and avatar
#[spacetimedb::reducer]
pub fn update_profile(
    ctx: &ReducerContext,
    display_name: String,
    avatar_url: Option<String>,
) -> Result<(), String> {
    let user = ctx
        .db
        .user()
        .identity()
        .find(ctx.sender())
        .ok_or("User not found — please register first")?;
    ctx.db.user().identity().update(User {
        display_name,
        avatar_url,
        updated_at: ctx.timestamp,
        ..user
    });
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Team management
// ──────────────────────────────────────────────────────────────────────────────

/// Create a new team; the creator becomes Owner
#[spacetimedb::reducer]
pub fn create_team(ctx: &ReducerContext, name: String, slug: String) -> Result<(), String> {
    ctx.db
        .user()
        .identity()
        .find(ctx.sender())
        .ok_or("User not found — please register first")?;
    if name.trim().is_empty() || slug.trim().is_empty() {
        return Err("Team name and slug are required".to_string());
    }
    if ctx.db.team().slug().find(&slug).is_some() {
        return Err(format!("Slug '{}' is already taken", slug));
    }
    let team = ctx.db.team().insert(Team {
        id: 0,
        name,
        slug,
        owner_identity: ctx.sender(),
        avatar_url: None,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
    });
    ctx.db.team_member().insert(TeamMember {
        id: 0,
        team_id: team.id,
        user_identity: ctx.sender(),
        role: MemberRole::Owner,
        joined_at: ctx.timestamp,
    });
    Ok(())
}

/// Invite a user to a team (Admin/Owner only)
#[spacetimedb::reducer]
pub fn invite_team_member(
    ctx: &ReducerContext,
    team_id: u64,
    user_identity: Identity,
    role: MemberRole,
) -> Result<(), String> {
    let caller = ctx
        .db
        .team_member()
        .team_id()
        .filter(&team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    match caller.role {
        MemberRole::Owner | MemberRole::Admin => {}
        _ => return Err("Only owners and admins can invite members".to_string()),
    }
    let already = ctx
        .db
        .team_member()
        .team_id()
        .filter(&team_id)
        .any(|m| m.user_identity == user_identity);
    if already {
        return Err("User is already a member of this team".to_string());
    }
    ctx.db.team_member().insert(TeamMember {
        id: 0,
        team_id,
        user_identity,
        role,
        joined_at: ctx.timestamp,
    });
    Ok(())
}

/// Update a member's role (Owner only)
#[spacetimedb::reducer]
pub fn update_member_role(
    ctx: &ReducerContext,
    team_id: u64,
    user_identity: Identity,
    new_role: MemberRole,
) -> Result<(), String> {
    let caller = ctx
        .db
        .team_member()
        .team_id()
        .filter(&team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    match caller.role {
        MemberRole::Owner => {}
        _ => return Err("Only the owner can change member roles".to_string()),
    }
    let target = ctx
        .db
        .team_member()
        .team_id()
        .filter(&team_id)
        .find(|m| m.user_identity == user_identity)
        .ok_or("Target user is not a member of this team")?;
    match new_role {
        MemberRole::Owner => {
            return Err("Use transfer_ownership to change ownership".to_string())
        }
        _ => {}
    }
    ctx.db.team_member().id().update(TeamMember {
        role: new_role,
        ..target
    });
    Ok(())
}

/// Remove a member from a team (Admin/Owner only)
#[spacetimedb::reducer]
pub fn remove_team_member(
    ctx: &ReducerContext,
    team_id: u64,
    user_identity: Identity,
) -> Result<(), String> {
    let caller = ctx
        .db
        .team_member()
        .team_id()
        .filter(&team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    match caller.role {
        MemberRole::Owner | MemberRole::Admin => {}
        _ => return Err("Only owners and admins can remove members".to_string()),
    }
    let target = ctx
        .db
        .team_member()
        .team_id()
        .filter(&team_id)
        .find(|m| m.user_identity == user_identity)
        .ok_or("Target user is not a member of this team")?;
    match target.role {
        MemberRole::Owner => return Err("Cannot remove the team owner".to_string()),
        _ => {}
    }
    ctx.db.team_member().id().delete(&target.id);
    Ok(())
}

/// Leave a team (cannot leave if you are the Owner)
#[spacetimedb::reducer]
pub fn leave_team(ctx: &ReducerContext, team_id: u64) -> Result<(), String> {
    let member = ctx
        .db
        .team_member()
        .team_id()
        .filter(&team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    match member.role {
        MemberRole::Owner => return Err("Transfer ownership before leaving the team".to_string()),
        _ => {}
    }
    ctx.db.team_member().id().delete(&member.id);
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Service management
// ──────────────────────────────────────────────────────────────────────────────

/// Create a new service under a team
#[spacetimedb::reducer]
pub fn create_service(
    ctx: &ReducerContext,
    team_id: u64,
    name: String,
    service_kind: ServiceKind,
    region: Region,
    repo_url: Option<String>,
    branch: Option<String>,
    build_command: Option<String>,
    start_command: Option<String>,
    instance_type: InstanceType,
    port: Option<u32>,
    cron_schedule: Option<String>,
    health_check_path: Option<String>,
) -> Result<(), String> {
    ctx.db
        .team_member()
        .team_id()
        .filter(&team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    if name.trim().is_empty() {
        return Err("Service name is required".to_string());
    }
    if matches!(service_kind, ServiceKind::CronJob) && cron_schedule.is_none() {
        return Err("A cron schedule is required for CronJob services".to_string());
    }
    let slug = name.to_lowercase().replace(|c: char| !c.is_alphanumeric(), "-");
    let external_url = Some(format!("https://{}.onrender.com", slug));
    let internal_url = if matches!(service_kind, ServiceKind::PrivateService) {
        Some(format!("{}.internal", slug))
    } else {
        None
    };
    ctx.db.service().insert(Service {
        id: 0,
        team_id,
        owner_identity: ctx.sender(),
        name,
        service_kind,
        status: ServiceStatus::Creating,
        region,
        repo_url,
        branch,
        docker_command: None,
        build_command,
        start_command,
        instance_type,
        num_instances: 1,
        auto_scaling: false,
        min_instances: 1,
        max_instances: 1,
        port,
        health_check_path,
        cron_schedule,
        internal_url,
        external_url,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
    });
    Ok(())
}

/// Update mutable service configuration
#[spacetimedb::reducer]
pub fn update_service(
    ctx: &ReducerContext,
    service_id: u64,
    name: String,
    build_command: Option<String>,
    start_command: Option<String>,
    instance_type: InstanceType,
    port: Option<u32>,
    health_check_path: Option<String>,
    cron_schedule: Option<String>,
    branch: Option<String>,
) -> Result<(), String> {
    let service = ctx
        .db
        .service()
        .id()
        .find(&service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    ctx.db.service().id().update(Service {
        name,
        build_command,
        start_command,
        instance_type,
        port,
        health_check_path,
        cron_schedule,
        branch,
        updated_at: ctx.timestamp,
        ..service
    });
    Ok(())
}

/// Pause a service (stop billing, stop serving traffic)
#[spacetimedb::reducer]
pub fn pause_service(ctx: &ReducerContext, service_id: u64) -> Result<(), String> {
    let service = ctx
        .db
        .service()
        .id()
        .find(&service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    match service.status {
        ServiceStatus::Deleted => return Err("Cannot pause a deleted service".to_string()),
        ServiceStatus::Paused => return Err("Service is already paused".to_string()),
        _ => {}
    }
    ctx.db.service().id().update(Service {
        status: ServiceStatus::Paused,
        updated_at: ctx.timestamp,
        ..service
    });
    Ok(())
}

/// Resume a paused service
#[spacetimedb::reducer]
pub fn resume_service(ctx: &ReducerContext, service_id: u64) -> Result<(), String> {
    let service = ctx
        .db
        .service()
        .id()
        .find(&service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    match service.status {
        ServiceStatus::Paused | ServiceStatus::Suspended => {}
        _ => return Err("Service is not paused or suspended".to_string()),
    }
    ctx.db.service().id().update(Service {
        status: ServiceStatus::Live,
        updated_at: ctx.timestamp,
        ..service
    });
    Ok(())
}

/// Soft-delete a service
#[spacetimedb::reducer]
pub fn delete_service(ctx: &ReducerContext, service_id: u64) -> Result<(), String> {
    let service = ctx
        .db
        .service()
        .id()
        .find(&service_id)
        .ok_or("Service not found")?;
    let member = ctx
        .db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    match member.role {
        MemberRole::Owner | MemberRole::Admin => {}
        _ => return Err("Only owners and admins can delete services".to_string()),
    }
    ctx.db.service().id().update(Service {
        status: ServiceStatus::Deleted,
        updated_at: ctx.timestamp,
        ..service
    });
    Ok(())
}

/// Manually scale a service to N instances (disables autoscaling)
#[spacetimedb::reducer]
pub fn scale_service(
    ctx: &ReducerContext,
    service_id: u64,
    num_instances: u32,
) -> Result<(), String> {
    let service = ctx
        .db
        .service()
        .id()
        .find(&service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    if num_instances == 0 {
        return Err("num_instances must be at least 1".to_string());
    }
    ctx.db.service().id().update(Service {
        num_instances,
        auto_scaling: false,
        updated_at: ctx.timestamp,
        ..service
    });
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Deployments
// ──────────────────────────────────────────────────────────────────────────────

/// Trigger a new deployment (e.g. on git push or manual redeploy)
#[spacetimedb::reducer]
pub fn trigger_deploy(
    ctx: &ReducerContext,
    service_id: u64,
    commit_sha: Option<String>,
    commit_message: Option<String>,
) -> Result<(), String> {
    let service = ctx
        .db
        .service()
        .id()
        .find(&service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    match service.status {
        ServiceStatus::Deleted => return Err("Cannot deploy a deleted service".to_string()),
        _ => {}
    }
    ctx.db.deployment().insert(Deployment {
        id: 0,
        service_id,
        triggered_by: ctx.sender(),
        status: DeployStatus::Queued,
        commit_sha,
        commit_message,
        image_url: None,
        build_duration_secs: None,
        deploy_duration_secs: None,
        error_message: None,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
        finished_at: None,
    });
    // Mark service as creating while deploy is in progress
    ctx.db.service().id().update(Service {
        status: ServiceStatus::Creating,
        updated_at: ctx.timestamp,
        ..service
    });
    Ok(())
}

/// Update a deployment's status (called by the build worker)
#[spacetimedb::reducer]
pub fn update_deployment_status(
    ctx: &ReducerContext,
    deployment_id: u64,
    new_status: DeployStatus,
    error_message: Option<String>,
    build_duration_secs: Option<u32>,
    deploy_duration_secs: Option<u32>,
    image_url: Option<String>,
) -> Result<(), String> {
    let deployment = ctx
        .db
        .deployment()
        .id()
        .find(&deployment_id)
        .ok_or("Deployment not found")?;
    let service = ctx
        .db
        .service()
        .id()
        .find(&deployment.service_id)
        .ok_or("Service not found")?;

    let is_terminal = matches!(
        new_status,
        DeployStatus::Live
            | DeployStatus::Failed
            | DeployStatus::Cancelled
            | DeployStatus::Skipped
    );
    let finished_at = if is_terminal {
        Some(ctx.timestamp)
    } else {
        deployment.finished_at
    };

    // Determine new service status before moving new_status
    let new_service_status = match new_status {
        DeployStatus::Live => ServiceStatus::Live,
        DeployStatus::Failed
        | DeployStatus::Cancelled
        | DeployStatus::Skipped => service.status.clone(),
        _ => ServiceStatus::Creating,
    };

    ctx.db.deployment().id().update(Deployment {
        status: new_status,
        error_message,
        build_duration_secs,
        deploy_duration_secs,
        image_url,
        updated_at: ctx.timestamp,
        finished_at,
        ..deployment
    });

    ctx.db.service().id().update(Service {
        status: new_service_status,
        updated_at: ctx.timestamp,
        ..service
    });
    Ok(())
}

/// Cancel a queued or in-progress deployment
#[spacetimedb::reducer]
pub fn cancel_deployment(ctx: &ReducerContext, deployment_id: u64) -> Result<(), String> {
    let deployment = ctx
        .db
        .deployment()
        .id()
        .find(&deployment_id)
        .ok_or("Deployment not found")?;
    let service = ctx
        .db
        .service()
        .id()
        .find(&deployment.service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    match deployment.status {
        DeployStatus::Live
        | DeployStatus::Failed
        | DeployStatus::Cancelled
        | DeployStatus::Skipped => {
            return Err("Deployment is already finished".to_string());
        }
        _ => {}
    }
    ctx.db.deployment().id().update(Deployment {
        status: DeployStatus::Cancelled,
        finished_at: Some(ctx.timestamp),
        updated_at: ctx.timestamp,
        ..deployment
    });
    Ok(())
}

/// Append a log line to a deployment (called by build/deploy worker)
#[spacetimedb::reducer]
pub fn add_deployment_log(
    ctx: &ReducerContext,
    deployment_id: u64,
    level: LogLevel,
    message: String,
) -> Result<(), String> {
    ctx.db
        .deployment()
        .id()
        .find(&deployment_id)
        .ok_or("Deployment not found")?;
    ctx.db.deployment_log().insert(DeploymentLog {
        id: 0,
        deployment_id,
        level,
        message,
        timestamp: ctx.timestamp,
    });
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Environment variables
// ──────────────────────────────────────────────────────────────────────────────

/// Set (upsert) an env var on a service
#[spacetimedb::reducer]
pub fn set_env_var(
    ctx: &ReducerContext,
    service_id: u64,
    key: String,
    value: String,
    is_secret: bool,
) -> Result<(), String> {
    let service = ctx
        .db
        .service()
        .id()
        .find(&service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    if key.trim().is_empty() {
        return Err("Env var key cannot be empty".to_string());
    }
    let existing = ctx
        .db
        .env_var()
        .service_id()
        .filter(&service_id)
        .find(|e| e.key == key);
    if let Some(ev) = existing {
        ctx.db.env_var().id().update(EnvVar {
            value,
            is_secret,
            updated_at: ctx.timestamp,
            ..ev
        });
    } else {
        ctx.db.env_var().insert(EnvVar {
            id: 0,
            service_id,
            key,
            value,
            is_secret,
            created_at: ctx.timestamp,
            updated_at: ctx.timestamp,
        });
    }
    Ok(())
}

/// Delete an env var from a service
#[spacetimedb::reducer]
pub fn delete_env_var(ctx: &ReducerContext, env_var_id: u64) -> Result<(), String> {
    let ev = ctx
        .db
        .env_var()
        .id()
        .find(&env_var_id)
        .ok_or("Env var not found")?;
    let service = ctx
        .db
        .service()
        .id()
        .find(&ev.service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    ctx.db.env_var().id().delete(&env_var_id);
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Custom domains
// ──────────────────────────────────────────────────────────────────────────────

/// Add a custom domain to a service and generate a verification token
#[spacetimedb::reducer]
pub fn add_domain(
    ctx: &ReducerContext,
    service_id: u64,
    domain_name: String,
) -> Result<(), String> {
    let service = ctx
        .db
        .service()
        .id()
        .find(&service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    if domain_name.trim().is_empty() {
        return Err("Domain name is required".to_string());
    }
    let micros = ctx
        .timestamp
        .to_duration_since_unix_epoch()
        .unwrap_or_default()
        .as_micros();
    let verification_token = format!("render-verify-{:x}-{:x}", micros, service_id);
    ctx.db.domain().insert(Domain {
        id: 0,
        service_id,
        domain_name,
        verified: false,
        verification_token,
        tls_enabled: false,
        redirect_to_https: true,
        created_at: ctx.timestamp,
    });
    Ok(())
}

/// Mark a domain as verified and enable TLS
#[spacetimedb::reducer]
pub fn verify_domain(ctx: &ReducerContext, domain_id: u64) -> Result<(), String> {
    let domain = ctx
        .db
        .domain()
        .id()
        .find(&domain_id)
        .ok_or("Domain not found")?;
    let service = ctx
        .db
        .service()
        .id()
        .find(&domain.service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    ctx.db.domain().id().update(Domain {
        verified: true,
        tls_enabled: true,
        ..domain
    });
    Ok(())
}

/// Remove a custom domain
#[spacetimedb::reducer]
pub fn remove_domain(ctx: &ReducerContext, domain_id: u64) -> Result<(), String> {
    let domain = ctx
        .db
        .domain()
        .id()
        .find(&domain_id)
        .ok_or("Domain not found")?;
    let service = ctx
        .db
        .service()
        .id()
        .find(&domain.service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    ctx.db.domain().id().delete(&domain_id);
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Managed databases
// ──────────────────────────────────────────────────────────────────────────────

/// Provision a new managed database
#[spacetimedb::reducer]
pub fn create_database(
    ctx: &ReducerContext,
    team_id: u64,
    name: String,
    db_kind: DatabaseKind,
    region: Region,
    version: String,
    instance_type: InstanceType,
    storage_gb: u32,
) -> Result<(), String> {
    ctx.db
        .team_member()
        .team_id()
        .filter(&team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    if name.trim().is_empty() {
        return Err("Database name is required".to_string());
    }
    let slug = name.to_lowercase().replace(|c: char| !c.is_alphanumeric(), "-");
    let connection_string = match db_kind {
        DatabaseKind::Postgres => Some(format!(
            "postgresql://{}:password@{}-pg.internal:5432/{}",
            slug, slug, slug
        )),
        DatabaseKind::KeyValue => Some(format!("redis://{}-kv.internal:6379", slug)),
    };
    ctx.db.managed_database().insert(ManagedDatabase {
        id: 0,
        team_id,
        owner_identity: ctx.sender(),
        name,
        db_kind,
        status: DatabaseStatus::Creating,
        region,
        version,
        instance_type,
        storage_gb,
        connection_string,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
    });
    Ok(())
}

/// Transition database status (called when provisioning completes)
#[spacetimedb::reducer]
pub fn update_database_status(
    ctx: &ReducerContext,
    database_id: u64,
    status: DatabaseStatus,
) -> Result<(), String> {
    let db = ctx
        .db
        .managed_database()
        .id()
        .find(&database_id)
        .ok_or("Database not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&db.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    ctx.db.managed_database().id().update(ManagedDatabase {
        status,
        updated_at: ctx.timestamp,
        ..db
    });
    Ok(())
}

/// Delete a managed database
#[spacetimedb::reducer]
pub fn delete_database(ctx: &ReducerContext, database_id: u64) -> Result<(), String> {
    let db = ctx
        .db
        .managed_database()
        .id()
        .find(&database_id)
        .ok_or("Database not found")?;
    let member = ctx
        .db
        .team_member()
        .team_id()
        .filter(&db.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    match member.role {
        MemberRole::Owner | MemberRole::Admin => {}
        _ => return Err("Only owners and admins can delete databases".to_string()),
    }
    ctx.db.managed_database().id().update(ManagedDatabase {
        status: DatabaseStatus::Deleted,
        updated_at: ctx.timestamp,
        ..db
    });
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Autoscaling
// ──────────────────────────────────────────────────────────────────────────────

/// Configure or update the autoscaling policy for a service
#[spacetimedb::reducer]
pub fn update_scaling_policy(
    ctx: &ReducerContext,
    service_id: u64,
    min_instances: u32,
    max_instances: u32,
    target_cpu_percent: u32,
    target_memory_percent: u32,
    scale_up_cooldown_secs: u32,
    scale_down_cooldown_secs: u32,
) -> Result<(), String> {
    let service = ctx
        .db
        .service()
        .id()
        .find(&service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    if min_instances < 1 {
        return Err("min_instances must be at least 1".to_string());
    }
    if min_instances > max_instances {
        return Err("min_instances cannot exceed max_instances".to_string());
    }
    if target_cpu_percent > 100 || target_memory_percent > 100 {
        return Err("Target percent values must be 0–100".to_string());
    }
    let existing = ctx.db.scaling_policy().service_id().find(&service_id);
    if let Some(policy) = existing {
        ctx.db.scaling_policy().id().update(ScalingPolicy {
            min_instances,
            max_instances,
            target_cpu_percent,
            target_memory_percent,
            scale_up_cooldown_secs,
            scale_down_cooldown_secs,
            updated_at: ctx.timestamp,
            ..policy
        });
    } else {
        ctx.db.scaling_policy().insert(ScalingPolicy {
            id: 0,
            service_id,
            min_instances,
            max_instances,
            target_cpu_percent,
            target_memory_percent,
            scale_up_cooldown_secs,
            scale_down_cooldown_secs,
            updated_at: ctx.timestamp,
        });
    }
    // Enable autoscaling on the service
    ctx.db.service().id().update(Service {
        auto_scaling: true,
        min_instances,
        max_instances,
        updated_at: ctx.timestamp,
        ..service
    });
    Ok(())
}

/// Disable autoscaling (revert to fixed instance count)
#[spacetimedb::reducer]
pub fn disable_autoscaling(ctx: &ReducerContext, service_id: u64) -> Result<(), String> {
    let service = ctx
        .db
        .service()
        .id()
        .find(&service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    if let Some(policy) = ctx.db.scaling_policy().service_id().find(&service_id) {
        ctx.db.scaling_policy().id().delete(&policy.id);
    }
    ctx.db.service().id().update(Service {
        auto_scaling: false,
        updated_at: ctx.timestamp,
        ..service
    });
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Persistent disks
// ──────────────────────────────────────────────────────────────────────────────

/// Attach a persistent disk to a service
#[spacetimedb::reducer]
pub fn attach_disk(
    ctx: &ReducerContext,
    service_id: u64,
    name: String,
    mount_path: String,
    size_gb: u32,
) -> Result<(), String> {
    let service = ctx
        .db
        .service()
        .id()
        .find(&service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    if mount_path.trim().is_empty() {
        return Err("Mount path is required".to_string());
    }
    if size_gb == 0 {
        return Err("Disk size must be at least 1 GB".to_string());
    }
    ctx.db.persistent_disk().insert(PersistentDisk {
        id: 0,
        service_id,
        name,
        mount_path,
        size_gb,
        created_at: ctx.timestamp,
    });
    Ok(())
}

/// Detach and delete a persistent disk
#[spacetimedb::reducer]
pub fn detach_disk(ctx: &ReducerContext, disk_id: u64) -> Result<(), String> {
    let disk = ctx
        .db
        .persistent_disk()
        .id()
        .find(&disk_id)
        .ok_or("Disk not found")?;
    let service = ctx
        .db
        .service()
        .id()
        .find(&disk.service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    ctx.db.persistent_disk().id().delete(&disk_id);
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Preview environments
// ──────────────────────────────────────────────────────────────────────────────

/// Create an ephemeral preview environment for a pull request
#[spacetimedb::reducer]
pub fn create_preview_env(
    ctx: &ReducerContext,
    service_id: u64,
    pr_number: u32,
    pr_title: String,
    branch: String,
) -> Result<(), String> {
    let service = ctx
        .db
        .service()
        .id()
        .find(&service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    let slug = branch.to_lowercase().replace(|c: char| !c.is_alphanumeric(), "-");
    let url = format!("https://pr-{}-{}.onrender.com", pr_number, slug);
    ctx.db.preview_env().insert(PreviewEnv {
        id: 0,
        service_id,
        pr_number,
        pr_title,
        branch,
        url,
        status: ServiceStatus::Creating,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
    });
    Ok(())
}

/// Update a preview environment's status
#[spacetimedb::reducer]
pub fn update_preview_env_status(
    ctx: &ReducerContext,
    preview_env_id: u64,
    status: ServiceStatus,
) -> Result<(), String> {
    let env = ctx
        .db
        .preview_env()
        .id()
        .find(&preview_env_id)
        .ok_or("Preview environment not found")?;
    let service = ctx
        .db
        .service()
        .id()
        .find(&env.service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    ctx.db.preview_env().id().update(PreviewEnv {
        status,
        updated_at: ctx.timestamp,
        ..env
    });
    Ok(())
}

/// Delete a preview environment when the PR is closed
#[spacetimedb::reducer]
pub fn delete_preview_env(ctx: &ReducerContext, preview_env_id: u64) -> Result<(), String> {
    let env = ctx
        .db
        .preview_env()
        .id()
        .find(&preview_env_id)
        .ok_or("Preview environment not found")?;
    let service = ctx
        .db
        .service()
        .id()
        .find(&env.service_id)
        .ok_or("Service not found")?;
    ctx.db
        .team_member()
        .team_id()
        .filter(&service.team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    ctx.db.preview_env().id().delete(&preview_env_id);
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Notifications
// ──────────────────────────────────────────────────────────────────────────────

/// Create a notification for a user
#[spacetimedb::reducer]
pub fn create_notification(
    ctx: &ReducerContext,
    user_identity: Identity,
    team_id: Option<u64>,
    service_id: Option<u64>,
    kind: NotificationKind,
    title: String,
    body: String,
) -> Result<(), String> {
    ctx.db.notification().insert(Notification {
        id: 0,
        user_identity,
        team_id,
        service_id,
        kind,
        title,
        body,
        read: false,
        created_at: ctx.timestamp,
    });
    Ok(())
}

/// Mark one notification as read
#[spacetimedb::reducer]
pub fn mark_notification_read(ctx: &ReducerContext, notification_id: u64) -> Result<(), String> {
    let notif = ctx
        .db
        .notification()
        .id()
        .find(&notification_id)
        .ok_or("Notification not found")?;
    if notif.user_identity != ctx.sender() {
        return Err("You can only mark your own notifications as read".to_string());
    }
    ctx.db.notification().id().update(Notification {
        read: true,
        ..notif
    });
    Ok(())
}

/// Mark all of the caller's notifications as read
#[spacetimedb::reducer]
pub fn mark_all_notifications_read(ctx: &ReducerContext) -> Result<(), String> {
    let to_update: Vec<Notification> = ctx
        .db
        .notification()
        .user_identity()
        .filter(&ctx.sender())
        .filter(|n| !n.read)
        .collect();
    for notif in to_update {
        ctx.db.notification().id().update(Notification {
            read: true,
            ..notif
        });
    }
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Audit log
// ──────────────────────────────────────────────────────────────────────────────

/// Append an audit log event (SOC 2 / compliance trail)
#[spacetimedb::reducer]
pub fn log_audit_event(
    ctx: &ReducerContext,
    team_id: u64,
    action: String,
    resource_type: String,
    resource_id: u64,
    details: Option<String>,
) -> Result<(), String> {
    ctx.db
        .team_member()
        .team_id()
        .filter(&team_id)
        .find(|m| m.user_identity == ctx.sender())
        .ok_or("You are not a member of this team")?;
    ctx.db.audit_log().insert(AuditLog {
        id: 0,
        team_id,
        actor_identity: ctx.sender(),
        action,
        resource_type,
        resource_id,
        details,
        timestamp: ctx.timestamp,
    });
    Ok(())
}
