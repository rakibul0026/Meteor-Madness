from django.db import models


class TeamMember(models.Model):
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=120)
    department = models.CharField(max_length=180, blank=True)
    university = models.CharField(max_length=180, blank=True)
    image_name = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class ImpactPrediction(models.Model):
    asteroid_id = models.CharField(max_length=100)
    diameter_m = models.FloatField()
    velocity_kms = models.FloatField()
    approach_date = models.DateField(null=True, blank=True)
    energy_megatons = models.FloatField()
    impact_probability = models.FloatField()
    risk_level = models.CharField(max_length=50)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.asteroid_id} - {self.risk_level}"
