namespace OctaPoint.Api.Application.Contracts;

public sealed record RequestContext(
    string RequestId,
    string TenantId,
    string ActorId,
    IReadOnlyCollection<string> Roles,
    string? IdempotencyKey = null);

public sealed record ControlResult<T>(
    T Data,
    string RequestId,
    string AuditEventId);