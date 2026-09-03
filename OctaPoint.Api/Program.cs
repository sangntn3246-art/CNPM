using OctaPoint.Api.Application.Controls;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddScoped<CreditControl>();
builder.Services.AddScoped<MerchantOnboardingControl>();
builder.Services.AddScoped<CampaignRuleControl>();
builder.Services.AddScoped<SettlementControl>();
builder.Services.AddScoped<FraudControl>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();

app.Run();
