package com.scubex.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyForecastResponse {

    private String date;
    private Integer weatherCode;
    private Double tempMax;
    private Double tempMin;
    private Double precipProbMax;
    private Double windSpeedMax;
    private Double waveHeightMax;
    private Double swellHeightMax;
    private String divingCondition;
}
