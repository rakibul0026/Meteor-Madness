from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="ImpactPrediction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("asteroid_id", models.CharField(max_length=100)),
                ("diameter_m", models.FloatField()),
                ("velocity_kms", models.FloatField()),
                ("approach_date", models.DateField(blank=True, null=True)),
                ("energy_megatons", models.FloatField()),
                ("impact_probability", models.FloatField()),
                ("risk_level", models.CharField(max_length=50)),
                ("latitude", models.FloatField(blank=True, null=True)),
                ("longitude", models.FloatField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="TeamMember",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("role", models.CharField(max_length=120)),
                ("department", models.CharField(blank=True, max_length=180)),
                ("university", models.CharField(blank=True, max_length=180)),
                ("image_name", models.CharField(blank=True, max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["name"]},
        ),
    ]
