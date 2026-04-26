from django.contrib import admin

from .models import ImpactPrediction, TeamMember


@admin.register(ImpactPrediction)
class ImpactPredictionAdmin(admin.ModelAdmin):
    list_display = ("asteroid_id", "risk_level", "energy_megatons", "impact_probability", "created_at")
    search_fields = ("asteroid_id", "risk_level")
    list_filter = ("risk_level", "created_at")


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ("name", "role", "department", "university")
    search_fields = ("name", "role")
